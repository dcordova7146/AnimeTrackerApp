const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const axios = require("axios");
const { Client } = require("pg");

const app = express();
const port = 3000;
//middle ware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.use(
  session({
    //to persit the information of a login across different get requests we must use express session
    secret: "cookies",
    resave: false,
    saveUninitialized: true,
  })
);

//psql setup
const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "TrackerApp",
  password: "lilted576",
  port: 5432,
});

db.connect((err) => {
  //precaution for connecting to the database
  if (err) {
    console.error("Database connection error", err.stack);
  } else {
    console.log("Database connected");
  }
});

// Database initialization
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(50) UNIQUE NOT NULL,
        username VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(20) UNIQUE NOT NULL
    );

      CREATE TABLE IF NOT EXISTS user_data (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        title VARCHAR(500) NOT NULL
    );
    `);
    console.log("Database initialized.");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
})();

//routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});
app.post("/login", async (req, res) => {
  const email = req.body.username; //store informtion from the login form to then store in the session cookie to persist the data across different pages
  const password = req.body.password;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (password === user.password) { // if password is correct store all required session data into the session
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.username = user.username;

        //repeated code i couldnt get away from since this animetitles information is necessary when rendering the profile ejs
        //anytime profile must be rendered i need this information plus all the relevant data about the user stored in the session
        const animeResult = await db.query(
          "SELECT title FROM user_data WHERE user_id = $1",
          [req.session.userId]
        );
        const animeTitles = animeResult.rows.map((row) => row.title); // Extract anime titles
        //console.log(animeTitles);

        res.render("profile.ejs", {
          username: user.username, // Pass username to ejs
          email: user.email, // Pass email to ejs
          animeTitles: animeTitles, // must pass this to the ejs as well
        });
      } else {
        res.send("Incorrect Password");
      }
    } else {
      res.send("User not found");
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      const result = await db.query(
        "INSERT INTO users (email, username, password) VALUES ($1, $2, $3)",
        [email, username, password]
      );
      console.log(result);

      // repeat code
      const animeResult = await db.query(
        "SELECT title FROM user_data WHERE user_id = $1",
        [req.session.userId]
      );
      const animeTitles = animeResult.rows.map((row) => row.title); // extract anime titles
      console.log(animeTitles);

      res.render("profile", {
        username: username,
        email: email,
        animeTitles: animeTitles, 
      });
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => { // destroy session info to log into a different account 
    if (err) {
      return res.status(500).send("Failed to log out");
    }
    res.redirect("/login"); // redirect to login page after logging out
  });
});

app.get("/profile", async (req, res) => {
  if (!req.session.userId) {
    console.log("test");
    return res.redirect("/login"); // redirect to login if the user isn't logged in
  }

  try {
    // fetch all data the profile ejs needs using session data and a query for animelist
    const userResult = await db.query(
      "SELECT username, email FROM users WHERE id = $1",
      [req.session.userId]
    );
    const user = userResult.rows[0]; 
    console.log(user);

    
    const animeResult = await db.query(
      "SELECT title FROM user_data WHERE user_id = $1",
      [req.session.userId]
    );
    const animeTitles = animeResult.rows.map((row) => row.title); // Extract anime titles
    console.log(animeTitles);

    // Render the profile page and pass user data and anime titles to the template
    res.render("profile", {
      username: user.username,
      email: user.email,
      animeTitles: animeTitles, // Pass the list of anime titles to the profile page
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching profile data");
  }
});

app.get("/search-anime", async (req, res) => {
  const { query } = req.query;
  try { //api call
    const response = await axios.get(
      `https://api.jikan.moe/v4/anime?q=${query}`
    );
    res.json(response.data); // Send the data to the client
  } catch (err) {
    console.error("Error fetching anime data:", err.message);
    res.status(500).json({ error: "Failed to fetch anime data." });
  }
});

app.get("/anime-details/:id", async (req, res) => { //make an api call but grab the id from clicking on an anime in the search 
  const { id } = req.params;
  const user = req.session.userId;
  try {
    const response = await axios.get(`https://api.jikan.moe/v4/anime/${id}`);
    res.render("details", { anime: response.data.data, user });
  } catch (err) {
    console.error("Error fetching anime details:", err.message);
    res.status(500).json({ error: "Failed to fetch anime details." });
  }
});

app.post("/anime-details/add-to-list", async (req, res) => {
  //console.log("Request body:", req.body);  
  console.log("Session userId:", req.session.userId); 

  if (!req.session.userId) {
    console.log("User not logged in");
    return res.redirect("/login"); // Redirect to login if not logged in
  }

  const { anime_title, anime_id } = req.body; // Get anime details from the form
  console.log("Anime Title:", req.body.animeTitle);
  try {
    // Insert anime into the user_data table
    await db.query(
      "INSERT INTO user_data (user_id, title) VALUES ($1, $2)",
      [req.session.userId, req.body.animeTitle] // Store the anime to the database
    );

    console.log("Anime added successfully to the list");
    res
      .status(200)
      .json({ success: true, message: "Anime added successfully!" }); // popup to show successfull add on to list
  } catch (err) {
    console.error("Unable to add anime:", err);
    res.status(500).send("Error adding anime to the list");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
