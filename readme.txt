Diego Cordova Final Project:
simple anime list tracker app
using pgadmin4 I tracked my database, and to run it ive been using nodemon app.js and going to localhost:3000
dependencies:
Axiom, Express, Express-session, pg, body-parser

I used 2 tables; users, and user_data
users has usernames, emails, passwords, and primary key for each user, the user_data tracks all users anime lists by listing the user_id as a foreign key and having the title of the anime


Database query:
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

add to table using the register page in the website
add to a user_data table by being logged into an account and then pressing the add to list button on an anime 
to add anime to list firtst search an anime on the home page then when you find the anime you want to add click on the anime card then you will be taken to the anime details page here there should be a add to list button a pop up will tell you if this was successfull test logged in and not

const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "TrackerApp",
  password: "lilted576",
  port: 5432,
});

this is my postgres information change the password for yours and it should run fine

