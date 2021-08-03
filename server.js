const _ = require("underscore");
const express = require("express");
const fs = require("fs");

const Moment = require("moment");
const MomentRange = require("moment-range");

const moment = MomentRange.extendMoment(Moment);
const app = express();
const port = process.env.PORT || 5000;

// console.log that your server is up and running
app.listen(port, () => console.log(`Listening on port ${port}`));

// create a GET route
// app.get("/express_backend", (req, res) => {
//   res.send({ express: "YOUR EXPRESS BACKEND IS CONNECTED TO REACT" });
// });

// Sort all text data to an Object
const getEmployeesList = (data, empId) => {
  let employees = {};
  busyTimeList = [];
  data.forEach(element => {
    let employeeData = element.split(";"),
      employeeBusyTime = {};

    if (
      employeeData[1] !== undefined &&
      employeeData[2] !== undefined &&
      employeeData[1].toString().includes(":") &&
      employeeData[2].toString().includes(":")
    ) {
      employeeBusyTime.startTime = moment(employeeData[1])
        .local()
        .format("YYYY-MM-DD HH:mm:ss");
      employeeBusyTime.endTime = moment(employeeData[2])
        .local()
        .format("YYYY-MM-DD HH:mm:ss");
    }
    if (employees[employeeData[0]] === undefined) {
      busyTimeList = [];
      busyTimeList.push(employeeBusyTime);
    } else {
      busyTimeList = employees[employeeData[0]];
      busyTimeList.push(employeeBusyTime);
    }
    employees[employeeData[0]] = busyTimeList;
  });
  return [{ ...employees }];
};

const getMeetingSlots = (dur, busySlots, date) => {
  const workStartTime = date + "T08:00:00+01:00",
    workEndTime = date + "T17:00:00+01:00",
    meetingStartTimes = [],
    dur1 = Number(dur);
  let freeSlots = [],
    count = 0;
  expectedBeginTime = workStartTime;

  // Creates the Meeting start times
  while (expectedBeginTime < workEndTime) {
    if (meetingStartTimes.length == 0) {
      meetingStartTimes.push(expectedBeginTime);
    }
    expectedBeginTime = moment(expectedBeginTime)
      .add(moment.duration(30, "minutes"))
      .format();
    meetingStartTimes.push(expectedBeginTime);
  }

  // Creates max possible meeting slots based on duration
  let expectedMeetingSlots = meetingStartTimes.map(slot => {
    let expectedMeetingEndTime = moment(slot)
      .add(moment.duration(dur1, "minutes"))
      .format();
    if (expectedMeetingEndTime <= workEndTime) {
      return {
        startTime: slot,
        endTime: expectedMeetingEndTime
      };
    }
  });

  // Method to get all free Slots
  const getFreeSlots = meetingSlots => {
    if (count < busySlots.length) freeSlots = [];
    else return;
    meetingSlots.map((expectedSlot, i) => {
      if (expectedSlot && busySlots) {
        let slot1 = moment.range([
          expectedSlot.startTime,
          expectedSlot.endTime
        ]);
        let slot2 = moment.range([
          busySlots[count].startTime,
          busySlots[count].endTime
        ]);
        // console.log("intersection", slot1.intersect(slot2));
        // console.log("within", moment(expectedSlot.startTime).within(slot2));
        // console.log(
        //   "contains",
        //   slot2.contains(slot1.start, { excludeEnd: true })
        // );
        if (
          !(
            slot2.contains(slot1.start, { excludeEnd: true }) ||
            slot1.intersect(slot2)
          )
        ) {
          freeSlots = [
            ...freeSlots,
            {
              startTime: expectedSlot.startTime,
              endTime: expectedSlot.endTime
            }
          ];
        }
      }
    });

    if (count < busySlots.length) {
      count = count + 1;
      getFreeSlots(freeSlots);
    }
    return freeSlots;
  };

  freeslots = getFreeSlots(expectedMeetingSlots);

  freeSlots.forEach(slot => {
    slot.startTime = moment(slot.startTime)
      .local()
      .format("HH:mm:ss");
    slot.endTime = moment(slot.endTime)
      .local()
      .format("HH:mm:ss");
  });

  return freeSlots;
};

app.get("/fetchmeetingtime/:employeeId/:date&:duration", (req, res) => {
  fs.readFile("freebusy.txt", "utf-8", (e, data) => {
    let employees = data.toString().split("\n"),
      newDate;
    const { employeeId, date, duration } = req.params;
    newDate = moment(date).format("YYYY-MM-DD");
    if (e) throw e;

    // Get the Employee details from the data
    const selectedEmployeeArray = _.filter(employees, data => {
      return data.toString().includes(employeeId);
    });

    // Get employee schedules
    const employeeSchedule = getEmployeesList(selectedEmployeeArray);

    // Get sorted busy slots for the date
    const selectedEmployeeBusySlots = _.sortBy(
      _.filter(employeeSchedule[0][employeeId], data => {
        if (data.startTime || data.endTime) {
          return (
            data.startTime.toString().includes(newDate) ||
            data.endTime.toString().includes(newDate)
          );
        }
      }),
      a => {
        return a.startTime;
      }
    );

    const freeSlots = getMeetingSlots(
      duration,
      selectedEmployeeBusySlots,
      date
    );

    res.send({
      // selectedEmployeeBusySlots
      // employeeSchedule
      // employees
      freeSlots
    });
  });
});
