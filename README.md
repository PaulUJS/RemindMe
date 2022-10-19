# RemindMe
## Overview
RemindMe is a website that I started making to help me remember future plans, and appointments I have because otherwise they are scatterd
randomly throughout my notes app. I made this with HTML, CSS, and vanilla javascript for the frontend, and used node.js express.js, and mySQL database 
for the backend.
## Landing page
Remind me has a landing page that's meant to explain the purpose of the website, and navigation that leads to the sign up, and log in pages
## Sign up and Log in pages
RemindMe also has sign up, and log in pages where users can create accounts, and log in. I made the user registration, authentication system myself. 
When each user is registered their password is encrypted and then all their information is put into the mySQL database, once the user logs in and is 
authenticated they are logged in their own express session, which is essentially their log in session. When users log out the session is ended and theyre
returned to the landing page
## User page and create reminder funtionality
Upon logging if they have previously made reminders, each user has their reminders displayed for them with the reminder content, date, and time. The user page
has a button that navigates to the create reminders page, on this page they get to input their reminder, it's date, and it's time, then be redirected to their
user page once they submit the reminder. Also, if a user clicks on one of their reminders they are redirected to a page showing only that reminder, 
where they can either delete it, removing it from their page and the database, or they can edit it. Editing the reminder redirects the user to a page identical
to the create reminders page, but this page has the reminder information filled in already so the user can edit it. Once they make the edit the reminder is
updated in the database and on the user page.
## Reminder email service
The email service runs in the schedule.js file which has a function that runs once a day, this function selects reminders from the database that are a week
from the current date of the program running. After the reminders are selected emails begin to be sent out to each user who made a specific reminder, containing
some text, the reminders content, date, and time. To make this email service I used nodemailer to send emails, and node-cron to have the code scheduled and
run once daily.
