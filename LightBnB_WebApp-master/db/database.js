const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');

const pool = new Pool({
  user: 'labber',
  password: 'labber',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool.query(`SELECT * FROM users WHERE email = $1;`, [email])
  .then((response) => {
   const user = response.rows[0];
   return user;
  })
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool.query(`SELECT * FROM users WHERE id = $1;`, [id])
  .then((response) => {
   const user = response.rows[0];
   return user;
  })
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `INSERT INTO users (name, email, password) 
  VALUES ($1, $2, $3)
  RETURNING *;`;
  const values = [user.name, user.email, user.password];

  return pool
     .query(queryString, values)
     .then((response) => {
      return response.rows[0]
     })
     .catch((err) => {
      console.log(err);
     })
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `SELECT reservations.*, properties.*, avg(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  AND end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`;

  const values = [guest_id, limit];

  return pool.query(queryString, values)
  .then((response) => {
    return response.rows;
  })
  .catch((err) => {
    console.log(err);
  })
  
};


/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
    // 1
    const queryParams = [];
    // 2
    let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
    `;
  
    // 3
    if (options.city) {
      queryParams.push(`%${options.city}%`);
      queryString += `WHERE city LIKE $${queryParams.length} `;
    }

    if (options.owner_id) {
      queryParams.push(`${options.owner_id}`);
      queryString += `AND owner_id = $${queryParams.length} `;
    }

    if (options.minimum_price_per_night && options.maximum_price_per_night) {
      queryParams.push(`${Number(options.maximum_price_per_night)}` * 100);
      queryString += `AND cost_per_night >= $${queryParams.length} `;
      queryParams.push(`${Number(options.minimum_price_per_night)}` * 100);
      queryString += `AND cost_per_night <= $${queryParams.length} `;
    }
  
    // 4
    queryString += `
    GROUP BY properties.id
    `;

    if (options.minimum_rating) {
      queryParams.push(`${options.minimum_rating}`);
      queryString += `HAVING AVG(rating) >= $${queryParams.length}`;
    }
  
    queryParams.push(limit);
    queryString += `
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;

    // 5
    console.log(queryString, queryParams);
  
    // 6
    return pool.query(queryString, queryParams).then((res) => res.rows);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
