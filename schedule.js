const cron = require('node-cron')

// Creates db connection
const db = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
  });

// Connect to database
db.connect((err) => {
    if (err) {
      throw err;
    }
    console.log("MySql has connected");
});

// Schedule tasks to be run on the server.
cron.schedule('0 0 * * *', function() {
    let date = new Date();
	let current_date = (date.getFullYear+"-"+date.getMonth()+"-"+ date.getDate() + 7)
    let user_date;
    date.get

    const search = "SELECT * FROM reminders where id = ?";
    const reminder_search = mysql.format(search, [new_id[0]]);

    db.query(reminder_search, async (err, res) => {

    })

    if (x + 7 == date.getDate() && x == date.getMonth()) {

    }
});

async function main(reciever) {
    // creates the email object that will be sending reminder emails
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_SERVICE,
        pass: process.env.EMAIL_PASS
      }
    });
  
    // send mail with defined transport object
    let email_details = await transporter.sendMail({
      from: process.env.EMAIL_SERVICE, // sender address
      to: reciever, // list of receivers
      subject: "Hello", // Subject line
      text: "Hello world?", // plain text body
      html: "<b>Hello world?</b>", // html body
    });
  
    console.log('Email has been sent')
  }