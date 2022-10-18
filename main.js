const express = require('express');
const res = require('express/lib/response');
const mysql = require('mysql2');
const { dirname } = require('path');
const path = require('path');
const session = require('express-session');
const bcrypt = require("bcrypt");
const { send, sendStatus } = require('express/lib/response');
const store = new session.MemoryStore();
require('dotenv').config();

// User variables
var user_reminders = [];
var current_reminder = [];
var updated_reminder = [];
var active = 0;

//
// Making this into an array lets me save the id without it refreshing every http request
var user_id = []

// Reminder variables
var reminderDate;
var reminderTime;
var reminderContent;
  
// Create database connection
const db = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
    
});

// Connect to database
db.connect((err) => {
    if(err){
        throw err;
    }
    console.log('MySql has connected');
});

const app = express();

// Creating the app login session manager
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: false,
    cookie: {maxAge: 30000},
    store
}));

// Makes the css and html files accessable  
app.use(express.static(path.join(__dirname, '/views')));
app.use(express.static(path.join(__dirname, '/public')));

app.set('view engine', 'ejs')

// Gets form info from html forms and reads as json
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Creating database
app.get('/createdb', (req, res) => {
    let sql = 'CREATE DATABASE NodeMySQL';
    db.query(sql, (err,result) => {
        if(err) throw err;
        console.log(result);
        res.send('database created')
    })
});

// Sets up server with expressJS
app.listen('3000', () => {
    console.log('server started on port 3000');

});

// Create the reminders table
app.get('/createremindertable', (req, res) => {
    let sql = 'CREATE TABLE reminders(id int NOT NULL, reminder VARCHAR(255), date VARCHAR(255), time VARCHAR(255), re_id int NOT NULL, PRIMARY KEY (id, re_id))';
    db.query(sql, (err, result) => {
        if(err) throw err;
        console.log(result);
        res.send('Reminder table created');
    });
});

// Create the users table
app.get('/createusertable', (req, res) =>{
    let sql = 'CREATE TABLE user(id int AUTO_INCREMENT, email varchar(500) NOT NULL, password varchar(500) NOT NULL, PRIMARY KEY (id))';
    db.query(sql, (err, result) => {
        if(err) throw err;
        console.log(result);
        res.send('User table created')
    })
});

// Grabs current users reminders from db
function getReminders(new_id) {

    const search = "SELECT * FROM reminders where id = ?";
    const reminder_search = mysql.format(search, [new_id[0]]);

    db.query(reminder_search, async (err, res) => {
        if (err) throw err;

        for(let x = 0; x < res.length; x++){
            var reminderDate = res[x].date;
            var reminderTime = res[x].time;
            var reminderContent = res[x].reminder;
            var reminderID = x+1

            console.log("------> reminder Results");
            console.log(res.length);
            console.log(`new id is ${new_id[0]}`)
            user_reminders.push({
                date: reminderDate,
                time: reminderTime,
                content: reminderContent,
                id: reminderID
            });

            console.log(res);
        }

        if (res.length == 0) {
            console.log("--------> no reminders");
        }
    })
}

// Shows store info and url every http request
app.use((req, res, next) => {
    console.log(store)
    console.log(`${req.method} - ${req.url}`)
    next();
});

// Goes to homepage
app.get('/', (req, res) =>{
    res.render('index');
});

// Gets the html page for signup
app.get('/signup',(req, res) => {
    res.render('signup');
});

// allows you to post the signup page
app.post('/signup', async (req, res) =>{

    // Once user signs up they get sent to the login page
    res.redirect('/login')

    // Gets email and pass from html form
    // Also encrypts password
    const saltRounds = 10;
    const email = req.body.email;
    const hashedPass = await bcrypt.hash(req.body.password, saltRounds);

    //Connects to db
    db.connect( async (err, connect) => {
        if(err) throw err;

        const sqlSearch = "SELECT * FROM user where email = ?";
        const search_query = mysql.format(sqlSearch,[email]);

        const sqlInsert = "INSERT INTO user VALUES (0,?,?)";
        const insert_query = mysql.format(sqlInsert,[email, hashedPass]);

        // SQL search query to make sure this user isn't already registered 
        db.query(search_query, async (err, res) => {

            if (err) throw err;
                console.log("------> Search Results");
                console.log(res.length);

            if (res.length != 0) {
                console.log("------> User already exists");
            } 

            // If the user isn't registered they get inserted into the db as a new user
            else {
                db.query (insert_query, (err, res)=> {
                
            if (err) throw err;
                console.log ("--------> Created new User");
                console.log(res.insertId);
            })
            }
        })
    })
});

// Gets the login html page
app.get('/login', (req, res) => {
    // If the user is logged in redirects to the users profile
    if (req.session.authenticated == true){
        console.log(`active users 1`)
        res.redirect('/userpage')
    }
    // If user isn't logged in then they're sent the login page
    else {
        user_reminders = [];
        console.log('no active users')
        res.render('login');
    }
});


// Posts the login html page after submssion
app.post("/login", (req, res)=> {
    // Grabs html data from form
    const email = req.body.email;
    const password = req.body.password;

    const sqlSearch = "SELECT * FROM user where email = ?";
    const search_query = mysql.format(sqlSearch,[email]);
    // Once user is authetnicated changes their session to authenticated
    //  Also changes the session user to current user
    req.session.authenticated = true
    req.session.user = `${email}`
    // Query to check if user exists in DB
    db.query(search_query,(err, res) => {
    
        if (err) throw err;
            console.log("------> Search Results");
            console.log(res.length);
        if (res.length == 0) {
            console.log("--------> User does not exist");
        }

        else {
            //get the hashedPassword from res
            const hashedPass = res[0].password;
        // If user exists (checked by email) checks to see if password matches
        if (bcrypt.compare(password, hashedPass)) {
            console.log("---------> Login Successful");
            // Grabs the current logged in users ID
            const id = res[0].id;
            user_id.push(id);
            // Changes value of ID of the current user's ID
            getReminders(user_id)
        }
        else {
            console.log("---------> Password Incorrect");
        }
        }
    })
    // Once the user is correctly logged in they are sent to their user page
    res.redirect(`/userpage`)
}
);

// Gets the user html page
app.get('/userpage', (req, res,) => {
    console.log('userpage received')
    console.log(`this is user id ${user_id[0]}`)
    // Renders userpage with the users reminders as html elements
    res.render('userpage', {user_reminders: user_reminders});
    console.log('userpage rendered')
    // Check to make sure user matches profile
    let email = req.session.user
    current_reminder = []
    console.log(`this is the email ${email}`)
});

// Log out function called when user presses logout
app.get('/userpage/:logout', (req, res) => {
    // Ends current user's session
    req.session.destroy();
    console.log('User has logged out');
    // Sets the value of user_reminders array to empty
    // This is so when user logs back in their reminders aren't repeated multiple times
    user_reminders = [];
    user_id = [];
    console.log(`list of reminders ${user_reminders.length}`)
    // After logging out the user is redirected to the home page
    res.redirect('/')
});

// Post request for user (used when they press add reminder)
app.post('/userpage', (req, res) => {
    console.log('User is making reminders');
    // Redirects user to the reminders page to make a reminder
    res.redirect('/reminders')
});

// Gets reminders page where user makes their reminder
app.get('/reminders', (req, res) => {
    res.render('reminders');
});

// Post request for submitting the reminder
app.post('/reminders',  (req, res)  => {
    // Once reminder is made user is sent back to the user page
    res.redirect('/userpage')

    db.connect( async (err, connect)=> {
        if (err) throw err;

        // Variables for reminder that will be inserted into db
        let str = JSON.stringify(req.body.remindertime);
        let date = req.body.reminderdate;
        let reminder = req.body.reminder;
        const id = user_id;
        var finalTime;

        // Slices first 2 numbers in the reminder time 
        const sliced = str.slice(1,3);
        const slicedEnd = str.slice(3,6);
        const timeInt = parseInt(sliced);
        
        // Checks if reminder time is AM or PM and changes the time to say which
        if (timeInt >= 12) {
            let newtime = timeInt - 12;
            var finalTime = `${newtime}${slicedEnd} PM`;
            console.log(date, finalTime, reminder);
        }
        else if(timeInt < 12 && timeInt != 0) {
            var finalTime = `${timeInt}${slicedEnd} AM`;
            console.log(date, finalTime, reminder);
        }
        else if(timeInt === 0) {
            var finalTime = `12${slicedEnd} AM`
            console.log(date, finalTime, reminder);
        }
        var len = user_reminders.length
        const sqlInsert = "INSERT INTO reminders (id, reminder, date, time, re_id) VALUES (?, ?, ?, ?, ?)";
        const insert_query = mysql.format(sqlInsert,[id, reminder, date, finalTime, len+1]);
        
        // Inserts the reminder information into the db
        db.query(insert_query, async (err, res) => {
            if (err) throw err;
                console.log('reminder created');
                console.log(`User id ${id} made this reminder`)
        })
        // Inserts an Object containing the user's reminder data into an array
        // This is so the user page reminder elements can change without relogging once reminder is created
        console.log(`index of final reminder: ${len}`)
        user_reminders.push({
            id: len+1   ,
            date: date,
            time: finalTime,
            content: reminder
        });
        console.log(user_reminders)
    })
});

// Gets the seeReminders page
// seeReminders page displays one speicifc reminder which they can edit/delete
app.get('/seeReminders',  (req, res) => {
    // Renders seeReminders with current_reminder array as html elements
    res.render('seeReminders', {current_reminder: current_reminder});
})

// Calls function that deletes the reminder at the specified ID
app.get('/seeReminders/:delete/:id', async (req, res) => {
    // ID of reminder user clicked on to delete
    let id = req.params['id'];
    //  ID param is an object so this gets the value of the object, returning the ID
    let i = Object.values(id);
    current_reminder = []
    user_reminders.forEach(x => {
        let content = x['content']
        let date = x['date']
        let time = x['time']
        let re_id = x['id']
        if (i > x['id']) {
            updated_reminder.push({
                content: content,
                date: date,
                time: time,
                id: re_id
            })
            console.log(`updated_reminder number first ${updated_reminder}`)
        }
        // Checks which reminder i(the chosen reminders ID) is equal to
        if (i == JSON.stringify(x['id'])) {
            console.log(`index is ${user_reminders.indexOf(x)}`)
            var index = user_reminders.indexOf(x)
            // Once the reminder is found in user_reminders the data is pushed into the current_reminder array as an object
            console.log(`Reminders pushed: ${current_reminder}`);
            
            // query for deleting the reminder
            const sqlDelete = "DELETE FROM reminders WHERE id = ?";
            const delete_query = mysql.format(sqlDelete,[user_id[0]]);
            // Deletes the reminder information into the db
            db.query(delete_query, async (err, res) => {
                if (err) throw err;
                    console.log(`reminders deleted`);
                    console.log(`User id ${user_id[0]} deleted this reminder`)
            })
        }
        if (i < x['id']) {
            // Removes reminder from user_reminders that user wants to delete
            user_reminders.splice(index, 1);
            console.log(`removed`)
            updated_reminder.push({
                content: content,
                date: date,
                time: time,
                id: re_id -1
            })
            console.log(`updated_reminder number next ${updated_reminder}`)
        }
    })

    updated_reminder.forEach(y => {
        const sqlInsert = "INSERT INTO reminders (id, reminder, date, time, re_id) VALUES (?, ?, ?, ?, ?)";
        const insert_query = mysql.format(sqlInsert,[user_id[0], y['content'], y['date'],y['time'], y['id']]);
        db.query(insert_query, async (err, res) => {
            if (err) throw err;
                console.log(`reminders inserted ${res.length}`);
                console.log(res)
        })
    })

    // Once remnider is deleted user is redirected to user page
    res.redirect('/userpage')
})

// Calls function that edits reminder at specified ID
app.get('/seeReminders/:edit',  (req, res) => {
    console.log('edit the reminder please')
    res.redirect('/editReminders')
})

// Once user clicks on a reminder calls function that grabs the reminder
app.get('/checkreminder/:id',  (req, res) => {
    // Iterates through user_reminders array
    user_reminders.forEach(x => {
        // ID of reminder user clicked on 
        let id = req.params;
        //  ID param is an object so this gets the value of the object, returning the ID
        let i = Object.values(id);
        
        // Checks which reminder i(the chosen reminders ID) is equal to
        if (i == JSON.stringify(x['id'])) {
            // Once the reminder is found in user_reminders the data is pushed into the current_reminder array as an object
            current_reminder.push({
                time: x['time'],
                date: x['date'],
                content: x['content'],
                id: x['id']
            });
        }
    })
    // Once the reminder is grabbed the user is redirected to the seeReminders page that displays this reminder
    res.redirect('/seeReminders');
})

// Gets the editReminders page which loads the reminder chosen by the user and allows them to edit it
app.get('/editReminders',  (req, res) => {
    res.render('editReminders', {current_reminder: current_reminder});
})

// Posts the editReminders page
app.post('/editReminders',  (req, res) => {
    db.connect( async (err, connect)=> {
        if (err) throw err;

        // Variables for reminder that will be inserted into db
        let str = JSON.stringify(req.body.remindertime);
        let date = req.body.reminderdate;
        let reminder = req.body.reminder;
        const arr = current_reminder[0]
        const id = user_id[0]
        let index = arr['id'] - 1;
        var finalTime;

        // Slices first 2 numbers in the reminder time 
        const sliced = str.slice(1,3);
        const slicedEnd = str.slice(3,6);
        const timeInt = parseInt(sliced);
        
        // Checks if reminder time is AM or PM and changes the time to say which
        if (timeInt >= 12) {
            let newtime = timeInt - 12;
            var finalTime = `${newtime}${slicedEnd} PM`;
            console.log(date, finalTime, reminder);
        }
        else if(timeInt < 12 && timeInt != 0) {
            var finalTime = `${timeInt}${slicedEnd} AM`;
            console.log(date, finalTime, reminder);
        }
        else if(timeInt === 0) {
            var finalTime = `12${slicedEnd} AM`
            console.log(date, finalTime, reminder);
        }
        
        for (let x = 0; x < 3; x++){
            if (x == 0){
                // Needs to get the reminder based on user_id
                let sqlUpdate = "UPDATE reminders SET ? WHERE re_id = ? AND id = ?";
                let update_query = mysql.format(sqlUpdate,[{reminder: reminder}, arr['id'], user_id[0]]);
                
                // Updates the reminder information into the db
                db.query(update_query, (err, res) => {
                    if (err) throw err;
                        console.log('reminder updated');
                        console.log(res.affectedRows + " record(s) updated");
                })
            }
            if (x == 1) {
                // Needs to get the reminder based on user_id
                let sqlUpdate = "UPDATE reminders SET ? WHERE re_id = ? AND id = ?";
                let update_query = mysql.format(sqlUpdate,[{date: date}, arr['id'], user_id[0]]);
                
                // Updates the reminder information into the db
                db.query(update_query, (err, res) => {
                    if (err) throw err;
                        console.log('date updated');
                        console.log(res.affectedRows + " record(s) updated");
                })
            }
            if (x == 2) {
                // Needs to get the reminder based on user_id
                let sqlUpdate = "UPDATE reminders SET ? WHERE re_id = ? AND id = ?";
                let update_query = mysql.format(sqlUpdate,[{time: finalTime}, arr['id'], user_id[0]]);
                
                // Updates the reminder information into the db
                db.query(update_query, (err, res) => {
                    if (err) throw err;
                        console.log('time updated');
                        console.log(res.affectedRows + " record(s) updated");
                        console.log(res)
                })
            }
        }

        // Inserts the edited reminder into an array, while removing the original reminder
        user_reminders.splice(index, 1, {
            id: arr['id'],
            date: date,
            time: finalTime,
            content: reminder
        })
        console.log(user_reminders)
    })
    res.redirect('/userpage')
})

app.get('/delete/:id', (req, res) => {
    let id = Object.values(req.params)
    const sqlDelete = "DELETE FROM reminders WHERE id = ? ";
    const delete_query = mysql.format(sqlDelete,[id]);
            
    // Deletes the reminder information into the db
    db.query(delete_query, async (err, res) => {
        if (err) throw err;
            console.log(`User id ${id} deleted this reminder`)
    })
})

app.get('/check/:id', (req, res) => {
    let id = Object.values(req.params)
    const search = "SELECT * FROM reminders where id = ?";
    const reminder_search = mysql.format(search, [id]);

    db.query(reminder_search, async (err, res) => {
        console.log(`this is the reminders ${JSON.stringify(res)}`)
    })
})
