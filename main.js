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
var active = 0;

//
// Making this into an array lets me save the id without it refreshing every http request
var user_id;

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
    let sql = 'CREATE TABLE reminders(id int, reminder VARCHAR(255), date VARCHAR(255), time VARCHAR(255), re_id int AUTO_INCREMENT, PRIMARY KEY (id))';
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
    const reminder_search = mysql.format(search, [new_id]);

    db.query(reminder_search, async (err, res) => {
        if (err) throw err;

        for(let x = 0; x < res.length; x++){
            var reminderDate = res[x].date;
            var reminderTime = res[x].time;
            var reminderContent = res[x].reminder;
            var reminderID = x+1

            console.log("------> reminder Results");
            console.log(res.length);
            console.log(`new id is ${new_id}`)
            user_reminders.push({
                date: reminderDate,
                time: reminderTime,
                content: reminderContent,
                id: reminderID
            });

            console.log(user_reminders);
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
        console.log('no active users')
        res.render('login');
    }
});


// Posts the login html page after submssion
app.post("/login", async (req, res)=> {
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
            user_id = id;
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
app.get('/userpage', async (req, res,) => {
    console.log('userpage received')
    // Renders userpage with the users reminders as html elements
    res.render('userpage', {user_reminders: user_reminders});
    console.log('userpage rendered')
    // Check to make sure user matches profile
    let email = req.session.user
    console.log(`this is the email ${email}`)
});

// Gets userpage for specific user based on ID
app.get('/userpage:id', async (req, res) => {
    let email = req.session.user
    req.params[user_id]
    // Changes to user page once logged in
    res.render('userpage', {user_reminders: user_reminders});
    console.log('user logged in');
});

// Log out function called when user presses logout
app.get('/userpage/:logout', (req, res) => {
    // Ends current user's session
    req.session.destroy();
    console.log('User has logged out');
    // Sets the value of user_reminders array to empty
    // This is so when user logs back in their reminders aren't repeated multiple times
    user_reminders = [];
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
app.post('/reminders', async (req, res)  => {
    // Once reminder is made user is sent back to the user page
    res.redirect('/userpage')

    db.connect( async (err, connect)=> {
        if (err) throw err;

        // Variables for reminder that will be inserted into db
        let str = JSON.stringify(req.body.remindertime);
        let date = JSON.stringify(req.body.reminderdate);
        let reminder = JSON.stringify(req.body.reminder);
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
            var finalTime = `${timeint}${slicedEnd} AM`;
            console.log(date, finalTime, reminder);
        }
        else if(timeInt === 0) {
            var finalTime = `12${slicedEnd} AM`
            console.log(date, finalTime, reminder);
        }
        
        const sqlInsert = "INSERT INTO reminders (id, reminder, date, time) VALUES (?, ?, ?, ?)";
        const insert_query = mysql.format(sqlInsert,[id, reminder, date, finalTime]);
        
        // Inserts the reminder information into the db
        db.query(insert_query, async (err, res) => {
            if (err) throw err;
                console.log('reminder created');
                console.log(`User id ${id} made this reminder`)
        })
        // Inserts an Object containing the user's reminder data into an array
        // This is so the user page reminder elements can change without relogging once reminder is created
        user_reminders.push({
            date: date,
            time: finalTime,
            content: reminder
        });
        console.log(user_reminders)
    })
});

// Gets the seeReminders page
// seeReminders page displays one speicifc reminder which they can edit/delete
app.get('/seeReminders', async (req, res) => {
    // Renders seeReminders with current_reminder array as html elements
    res.render('seeReminders', {current_reminder: current_reminder});
})

// Calls function that deletes the reminder at the specified ID
app.get('/seeReminders/:delete/:id', async (req, res) => {
    
    user_reminders.forEach(x => {
        // ID of reminder user clicked on to delete
        let id = req.params['id'];
        //  ID param is an object so this gets the value of the object, returning the ID
        let i = Object.values(id);
        
        // Checks which reminder i(the chosen reminders ID) is equal to
        if (i == JSON.stringify(x['id'])) {
            console.log(`index is ${user_reminders.indexOf(x)}`)
            let index = user_reminders.indexOf(x)
            // Removes reminder from user_reminders that user wants to delete
            user_reminders.splice(index, 1)
            console.log(user_reminders)
            // Once the reminder is found in user_reminders the data is pushed into the current_reminder array as an object
            current_reminder = []
            console.log(`Reminders pushed: ${current_reminder}`);
        }
    })
    // Once remnider is deleted user is redirected to user page
    res.redirect('/userpage')
})

// Calls function that edits reminder at specified ID
app.get('/seeReminders/:edit', async (req, res) => {

    res.render('seeReminders');
})

// Once user clicks on a reminder calls function that grabs the reminder
app.get('/checkreminder/:id', async (req, res) => {
    // Iterates through user_reminders array
    user_reminders.forEach(x => {
        // ID of reminder user clicked on 
        let id = req.params;
        //  ID param is an object so this gets the value of the object, returning the ID
        let i = Object.values(id);
        
        // Checks which reminder i(the chosen reminders ID) is equal to
        if (i == JSON.stringify(x['id'])) {
            console.log(`Preparing to push reminders: ${Object.values(x)}`);
            console.log(JSON.stringify(x['time']))
            // Once the reminder is found in user_reminders the data is pushed into the current_reminder array as an object
            current_reminder.push({
                time: JSON.stringify(x['time']),
                date: JSON.stringify(x['date']),
                content: JSON.stringify(x['content']),
                id: JSON.stringify(x['id'])
            });
            console.log(`Reminders pushed: ${current_reminder}`);
        }
    })
    // Once the reminder is grabbed the user is redirected to the seeReminders page that displays this reminder
    res.redirect('/seeReminders');
})
