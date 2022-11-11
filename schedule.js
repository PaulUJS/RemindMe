const res = require("express/lib/response");
const cron = require("node-cron");
const mysql = require("mysql2");
const express = require("express");
const { send, sendStatus } = require("express/lib/response");
require("dotenv").config();

// Create the db connection
const db = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
});

// Connect to database
db.connect((err) => {
    if (err) throw err;
});

// Schedule tasks to be run on the server.
cron.schedule("0 0 * * *", function () {
    let date = new Date();
    let next_week = date.getFullYear + "-" + date.getMonth() + "-" + date.getDate() + 7;

    const search = "SELECT * FROM reminders where date = ?";
    const reminder_search = mysql.format(search, [next_week]);

    // Selects reminders where the date is a week away
    db.query(reminder_search, (err, res) => {
        if (err) throw err;
        // iterates through the reminders
        for (let x = 0; x > res.length; x++) {
            let reminderDate = JSON.stringify(res[x].date);
            let reminderTime = JSON.stringify(res[x].time);
            let reminderContent = JSON.stringify(res[x].reminder);
            let remidnerEmail = JSON.stringify(res[x].email)
            // Calls function that sends the reminder email to the email corresponding to the reminder
            main(remidnerEmail, reminderContent, reminderTime, reminderDate)
        }
    });
});

// Main function that sends reminder emails to the user who made them
// Called a week before every reminder's date 
async function main(email, reminder, time, date) {
    // creates the email object that will be sending reminder emails
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_SERVICE,
            pass: process.env.EMAIL_PASS,
        },
    });

    // send mail with defined transport object
    let email_details = await transporter.sendMail({
        from: process.env.EMAIL_SERVICE, // sender address
        to: email, // list of receivers
        subject: "reminder", // Subject line
        text: `Don't forget, you have a reminder: ${reminder} on ${date} at ${time}, Thank you for using our service and have a great day!` // plain text body
    });
}
