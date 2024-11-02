/******************************************************************************
***
* ITE5315 – Assignment 2
* I declare that this assignment is my own work in accordance with Humber Academic Policy.
* No part of this assignment has been copied manually or electronically from any other source
* (including web sites) or distributed to other students.
*
* Name: Mohan Kumar Tulabandu Student ID: N01620006 Date: 30th October 2024
*
*
******************************************************************************
**/

// Import the required modules
const express = require('express');
const path = require('path');
const app = express();
const fs = require('fs');
const { engine } = require('express-handlebars');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set the port for the server; default to 3000 if not specified
const port = process.env.port || 3000;

// Set up the middleware to serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
// Set the views directory to the "views" directory
app.set('views', path.join(__dirname, 'views'));



// Configure the view engine for Handlebars with ".hbs" as the file extension
const hbs = engine({
    extname: '.hbs',
    defaultLayout: 'main',
    helpers: {
        highlightBlankMetascore: function (metascore) {
            return metascore === "" || metascore === "N/A";
        },
        hasMetascore: function (metascore) {
            return metascore && metascore !== "N/A" && metascore !== "";
        },
        json: function (context) {
            return JSON.stringify(context, null, 2);
        },
        formatDate: function (dateString) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        },
        handlebars: function (context) {
            return JSON.stringify(context, null, 2);
        }
    }
});
app.engine('hbs', hbs);
app.set('view engine', 'hbs');

//Bonus step adding partials
// fs.readFile(path.join(__dirname, 'views/partials/movieCard.hbs'), 'utf8', (err, data) => {
//     if (err) {
//         console.error("Error reading partial file:", err);
//         return;
//     }
//     hbs.handlebars.registerPartial('movieCard', data);
// });

// Function to read data from JSON file
let movieCache = null; // Cache variable

const readJsonFile = (res, callback) => {
    if (movieCache) {
        // If data is already cached, use it
        callback(movieCache);
    } else {
        // Read file and cache it
        fs.readFile('./movieData/movie-dataset-a2.json', 'utf8', (err, data) => {
            if (err) {
                console.log("Error Loading JSON File", err);
                res.status(500).send("Error Loading JSON File");
            } else {
                movieCache = JSON.parse(data); // Store parsed data in cache
                callback(movieCache);
            }
        });
    }
};

// Define the root route ("/") to render the "index" view
app.get('/', function (req, res) {
    res.render('index', { title: 'Express' });
});

// Define the root route ("/data") to render the "data" view
app.get('/data', (req, res) => {
    readJsonFile(res, () => res.render('pages/data', { title: 'Movie Data', message: 'JSON data is loaded and ready!' }));
});

// Define the "/data/movie/:index" route to render the "movie" view
app.get('/data/movie/:index', (req, res) => {
    const index = parseInt(req.params.index); // Parse the index from the request parameters

    // Validate the index against the cached movie data
    readJsonFile(res, (jsonData) => {
        if (index >= 0 && index < jsonData.length) {
            const movie = jsonData[index]; // Get the movie at the specified index
            res.render('pages/movie', {
                title: 'Movie Details',
                movieId: movie.Movie_ID,
                movieTitle: movie.Title,
                movieGenre: movie.Genre,
                movieYear: movie.Year,
                movieRating: movie.Rated,
                moviePoster: movie.Poster,
                moviePlot: movie.Plot
            });
        } else {
            // If index is out of bounds, render the error view
            res.status(404).render('error', {
                title: '404 Not Found',
                message: 'The movie index you entered does not exist.'
            });
        }
    });
});

// Define the "/data/search/id" route to render the "search-id" view
app.route("/data/search/id")
    .get((req, res) => {
        // Render the form for searching movies by ID
        res.render('pages/searchById', { title: 'Search Movie by ID' });
    })
    .post((req, res) => {
        const id = parseInt(req.body.id, 10); // Parse the ID from the request body

        // Check for valid ID range
        if (isNaN(id) || id < 0) {
            return res.render('error', {
                title: 'Invalid ID',
                message: 'Invalid ID Value! Please provide a valid ID value.',
                path: '/data/search/id',
                linkText: 'Search Again'
            });
        }

        // Read movie data from JSON file using the callback function
        readJsonFile(res, (jsonData) => {
            // Check if the ID exists in the movie data
            if (id < jsonData.length) {
                const movie = jsonData[id]; // Access the movie data by index
                res.render('pages/resultById', {
                    title: `Movie Details for ID: ${id}`,
                    movieId: movie.Movie_ID,
                    movieTitle: movie.Title,
                    movieGenre: movie.Genre,
                    movieYear: movie.Year,
                    movieRating: movie.Rated,
                    moviePoster: movie.Poster,
                    moviePlot: movie.Plot
                });
            } else {
                res.render('error', {
                    title: 'Movie Not Found',
                    message: 'No movie found with the given ID.',
                    path: '/data/search/id',
                    linkText: 'Search Again'

                });
            }
        });
    });

app.route("/data/search/title")
    .get((req, res) => {
        // Render a form for searching by title
        res.render('pages/searchByTitle', { title: 'Search Movie by Title' });
    })
    .post((req, res) => {
        const title = req.body.title.trim().toLowerCase(); // Get the title from the request
        if (!title) {
            return res.render('error', {
                title: 'Invalid Title',
                message: 'Please provide a valid title value.',
                path: '/data/search/title',
                linkText: 'Search Again'
            });
        }

        readJsonFile(res, (jsonData) => {
            // Search for movies that include the title
            const movies = jsonData.filter(movie => movie.Title.toLowerCase().includes(title));
            if (movies.length > 0) {
                // Render results to the resultByTitle template
                res.render('pages/resultByTitle', {
                    title: `Movie Details for Title: ${title}`,
                    movies: movies
                });
            } else {
                // Render an error page if no movies are found
                res.status(404).render('error', {
                    title: 'No Results Found',
                    message: 'No movies found with the given title.',
                    path: '/data/search/title',
                    linkText: 'Search Again'
                });
            }
        });
    });


//step-7
app.get('/data/allData', (req, res) => {
    readJsonFile(res, (jsonData) => {
        res.render('pages/allData', {
            title: 'All Movies',
            movies: jsonData // Pass the entire JSON data as movies
        });
    });
});

//step-8
app.get('/data/filteredData', (req, res) => {
    readJsonFile(res, (jsonData) => {
        res.render('pages/filteredData', {
            title: 'Filtered Movie Data',
            movies: jsonData
        });
    });
});

//step-9
app.get('/data/highlightedData', (req, res) => {
    readJsonFile(res, (jsonData) => {
        res.render('pages/highlightedData', {
            title: 'Highlighted Movie Data',
            movies: jsonData
        });
    });
});

app.get('/data/search/pg13', (req, res) => {
    readJsonFile(res, (jsonData) => {
        const pg13Movies = jsonData.filter(movie => movie.Rated === 'PG-13');
        res.render('pages/pg13Movies', {
            title: 'PG-13 Movies',
            movies: pg13Movies
        });
    });
});

// Define the "/users" route that sends a simple text response
app.get('/users', function (req, res) {
    res.send('respond with a resource');
});

// Define a catch-all route to handle any undefined routes and render an error view
app.get('*', function (req, res) {
    res.render('error', { title: 'Error', message: 'Wrong Route' });
});

// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});

module.exports = app;
