const express = require("express");
const res = require("express/lib/response");
const mysql = require("mysql2");
const { dirname } = require("path");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { send, sendStatus } = require("express/lib/response");
const store = new session.MemoryStore();
const nodemailer = require("nodemailer");
const { error } = require("console");
require("dotenv").config();


// User variables
let user_reminders = [];
let current_reminder = [];
let updated_reminder = [];

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

const app = express();

// Creating the app login session manager
app.use(
    session({
        secret: "secret",
        resave: true,
        saveUninitialized: false,
        cookie: { maxAge: 30000 },
        store,
    })
);

// Makes the css and html files accessable from the server
app.use(express.static(path.join(__dirname, "/views")));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.static(path.join(__dirname, "/image")));

app.set("view engine", "ejs");

// Gets form info from html forms and reads as json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sets up server with expressJS
app.listen("3000", () => {});

// Grabs current users reminders from db
function getReminders(new_id) {
    const search = "SELECT * FROM reminders where id = ?";
    const reminder_search = mysql.format(search, [new_id]);

    db.query(reminder_search, async (err, result) => {
        if (err) throw err;

        for (let x = 0; x < result.length; x++) {
            let reminderDate = result[x].date;
            let reminderTime = result[x].time;
            let reminderContent = result[x].reminder;
            let reminderID = x + 1;

            user_reminders.push({
                date: reminderDate,
                time: reminderTime,
                content: reminderContent,
                id: reminderID,
            });
        }
    });
}

// Shows store info and url every http request
app.use((req, res, next) => {
    console.log(store);
    console.log(`${req.method} - ${req.url}`);
    next();
});

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signup", async (req, res) => {

    // Gets email and pass from html form
    // Also encrypts password
    const saltRounds = 10;
    const email = req.body.email;
    const hashedPass = await bcrypt.hash(req.body.password, saltRounds);

    const sqlSearch = "SELECT * FROM user where email = ?";
    const search_query = mysql.format(sqlSearch, [email]);

    const sqlInsert = "INSERT INTO user VALUES (0,?,?)";
    const insert_query = mysql.format(sqlInsert, [email, hashedPass]);

    // SQL search query to make sure this user isn't already registered
    db.query(search_query, async (err, result) => {
        if (err) throw err;

        if (result.length != 0) {
            res.redirect('/signup')
        }

        // If the user isn't registered they get inserted into the db as a new user
        else {
            db.query(insert_query, (err, result) => {
                if (err) throw err;
                res.redirect('/login')
            });
        }
    });
});

app.get("/login", (req, res) => {
    // If the user is logged in redirects to the users profile
    if (req.session.authenticated == true) {
        res.redirect("/userpage");
    }
    // If user isn't logged in then they're sent the login page
    else {
        user_reminders = [];
        res.render("login");
    }
});

// Posts the login html page after submssion
app.post("/login", async (req, res) => {
    // Grabs html data from form
    const email = req.body.email;
    const password = req.body.password;

    const sqlSearch = "SELECT * FROM user where email = ?";
    const search_query = mysql.format(sqlSearch, [email]);

    // Query to check if user exists in DB
    db.query(search_query, async (err, result) => {
            if (result.length == 0) {
                console.log('no users with that email')
                req_var.session.authenticated = false;
                throw error
            } 

            else {
                //get the hashedPassword from res
                const hashedPass = result[0].password;
                // If user exists (checked by email) checks to see if password matches
                if (await bcrypt.compare(password, hashedPass) == true) {
                    // Grabs the current logged in users ID
                    const id = result[0].id;
                    // Once user is authetnicated changes their session to authenticated
                    //  Also changes the session user to current user
                    req.session.authenticated = true;
                    req.session.user = id;
                    // Changes value of ID of the current user's ID
                    getReminders(id);
                    res.redirect('/userpage')
                } 
                else if (await bcrypt.compare(password, hashedPass) == false){
                    req.session.authenticated = false;
                    res.redirect('/')
                }
            }
        });
});

app.get("/userpage", (req, res) => {
    // Renders userpage with the users reminders as html elements
    res.render("userpage", { user_reminders: user_reminders });
    current_reminder = [];
});

app.get("/userpage/:logout", (req, res) => {
    // Ends current user's session
    req.session.destroy();
    // Sets the value of user_reminders array to empty
    // This is so when user logs back in their reminders aren't repeated multiple times
    user_reminders = [];
    updated_reminder = [];

    res.redirect("/");
});

app.post("/userpage", (req, res) => {
    res.redirect("/reminders");
});

app.get("/reminders", (req, res) => {
    res.render("reminders");
});

app.post("/reminders", (req, res) => {

    // Variables for reminder that will be inserted into db
    let str = JSON.stringify(req.body.remindertime);
    let reminder = req.body.reminder;
    let date = req.body.reminderdate;
    const id = req.session.user;

    // Slices first 2 numbers in the reminder time
    const sliced = str.slice(1, 3);
    const slicedEnd = str.slice(3, 6);
    const timeInt = parseInt(sliced);

    // Checks if reminder time is AM or PM and changes the time to say which
    if (timeInt > 12) {
        let newtime = timeInt - 12;
        var finalTime = `${newtime}${slicedEnd} PM`;
    } else if (timeInt < 12 && timeInt != 0) {
        var finalTime = `${timeInt}${slicedEnd} AM`;
    } else if (timeInt === 0) {
        var finalTime = `12${slicedEnd} AM`;
    } else if (timeInt == 12) {
        var finalTime =`12${slicedEnd} PM`
    }
    let len = user_reminders.length;
    const sqlInsert = "INSERT INTO reminders (id, reminder, date, time, re_id) VALUES (?, ?, ?, ?, ?)";
    const insert_query = mysql.format(sqlInsert, [id,reminder,date,finalTime,len + 1,]);

    // Inserts the reminder information into the db
    db.query(insert_query, async (err, result) => {
        if (err) throw err;
    });
    // Inserts an Object containing the user's reminder data into an array
    // This is so the user page reminder elements can change without relogging once reminder is created
    user_reminders.push({
        id: len + 1,
        date: date,
        time: finalTime,
        content: reminder,
    });

    res.redirect("/userpage");
});

app.get("/seeReminders", (req, res) => {
    // Renders seeReminders with current_reminder array as html elements
    res.render("seeReminders", { current_reminder: current_reminder });
});

app.get("/seeReminders/:delete/:id", (req, res) => {
    // ID of reminder user clicked on to delete
    let id = req.params["id"];
    //  ID param is an object so this gets the value of the object, returning the ID
    let i = Object.values(id);
    current_reminder = [];
    user_reminders.forEach((x) => {
        // Gets reminder values from each reminder object in the array
        let content = x["content"];
        let date = x["date"];
        let time = x["time"];
        let re_id = x["id"];
        // If the reminder id is less than the reminder being deleted it's pushed into the array for updated reminders
        if (i > x["id"]) {
            updated_reminder.push({
                content: content,
                date: date,
                time: time,
                id: re_id,
            });
        }
        // Checks which reminder i(the chosen reminders ID) is equal to
        else if (i == x["id"]) {

            // Deletes all reminders from the database
            const sqlDelete = "DELETE FROM reminders WHERE id = ?";
            const delete_query = mysql.format(sqlDelete, [req.session.user]);
            // Deletes the reminder information into the db
            db.query(delete_query, (err, result) => {
                if (err) throw err;
            });
        }
        // Checks if if the deleted reminder's id is less than the id of reminder x it's pushed into the array
        // All reminders pushed here have their id decreased by 1 so the id of the reminder after the deleted reminder doesn't skip a number
        else if (i < x["id"]) {
            updated_reminder.push({
                content: content,
                date: date,
                time: time,
                id: re_id - 1,
            });
        }
    });

    // Each reminder in the updated_reminder array is inserted into the reminders db to keep the re_id values from being wrong
    updated_reminder.forEach((y) => {
        const sqlInsert = "INSERT INTO reminders (id, reminder, date, time, re_id) VALUES (?, ?, ?, ?, ?)";
        const insert_query = mysql.format(sqlInsert, [
            req.session.user,
            y["content"],
            y["date"],
            y["time"],
            y["id"],
        ]);
        db.query(insert_query, async (err, result) => {
            if (err) throw err;
        });
    });
    user_reminders = updated_reminder
    res.redirect("/userpage");
});

app.get("/seeReminders/:edit", (req, res) => {
    res.redirect("/editReminders");
});

app.get("/checkreminder/:id", (req, res) => {
    // Iterates through user_reminders array
    user_reminders.forEach((x) => {
        // ID of reminder user clicked on
        let id = req.params;
        //  ID param is an object so this gets the value of the object, returning the ID
        let i = Object.values(id);

        // Checks which reminder i(the chosen reminders ID) is equal to
        if (i == JSON.stringify(x["id"])) {
            // Once the reminder is found in user_reminders the data is pushed into the current_reminder array as an object
            current_reminder.push({
                time: x["time"],
                date: x["date"],
                content: x["content"],
                id: x["id"],
            });
        }
    });
    // Once the reminder is grabbed the user is redirected to the seeReminders page that displays this reminder
    res.redirect("/seeReminders");
});

app.get("/editReminders", (req, res) => {
    res.render("editReminders", { current_reminder: current_reminder });
});

app.post("/editReminders", (req, res) => {
    db.connect(async (err, connect) => {
        if (err) throw err;

        // Variables for reminder that will be inserted into db
        let str = JSON.stringify(req.body.remindertime);
        let date = req.body.reminderdate;
        let reminder = req.body.reminder;
        const arr = current_reminder[0];
        const id = req.session.user;
        let index = arr["id"] - 1;
        var finalTime;

        // Slices first 2 numbers in the reminder time
        const sliced = str.slice(1, 3);
        const slicedEnd = str.slice(3, 6);
        const timeInt = parseInt(sliced);

        // Checks if reminder time is AM or PM and changes the time to say which
        if (timeInt > 12) {
            let newtime = timeInt - 12;
            var finalTime = `${newtime}${slicedEnd} PM`;
        } else if (timeInt < 12 && timeInt != 0) {
            var finalTime = `${timeInt}${slicedEnd} AM`;
        } else if (timeInt === 0) {
            var finalTime = `12${slicedEnd} AM`;
        } else if (timeInt == 12) {
            var finalTime =`12${slicedEnd} PM`
        }

        for (let x = 0; x < 3; x++) {
            if (x == 0) {
                let sqlUpdate = "UPDATE reminders SET ? WHERE re_id = ? AND id = ?";
                let update_query = mysql.format(sqlUpdate, [{ reminder: reminder }, arr["id"], id,]);

                // Updates the reminder content into the db
                db.query(update_query, (err, result) => {
                    if (err) throw err;
                });
            }
            if (x == 1) {
                let sqlUpdate = "UPDATE reminders SET ? WHERE re_id = ? AND id = ?";
                let update_query = mysql.format(sqlUpdate, [{ date: date },arr["id"], id,]);

                // Updates the reminder date in the db
                db.query(update_query, (err, result) => {
                    if (err) throw err;
                });
            }
            if (x == 2) {
                let sqlUpdate = "UPDATE reminders SET ? WHERE re_id = ? AND id = ?";
                let update_query = mysql.format(sqlUpdate, [{ time: finalTime },arr["id"], id,]);

                // Updates the reminder time in the db
                db.query(update_query, (err, result) => {
                    if (err) throw err;
                });
            }
        }

        // Inserts the edited reminder into an array, while removing the original reminder
        user_reminders.splice(index, 1, {
            id: arr["id"],
            date: date,
            time: finalTime,
            content: reminder,
        });
    });
    res.redirect("/userpage");
});

app.get('/del', (req,res) => {
    const sqlDelete = "DELETE FROM reminders";

    db.query(sqlDelete, (err, result) => {
        if (err) throw err;
        console.log('deleted all')
    })
})

