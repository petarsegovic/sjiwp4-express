const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const { func } = require("joi");
const jwt = require("jsonwebtoken");
const {db} = require("./db.js");

function getUserJwt(id, email, name, role, expDays = 7) {
    const tokenData = {
        sub: id,
        email: email,
        name: name,
        role: role,
        time: Date.now()
    };

    const tokenOptions = {
        expiresIn: expDays * 24 * 60 * 60
    };

    const token = jwt.sign(tokenData, JWT_SECRET_KEY, tokenOptions);

    return token;
}

// MIDDLEWARE FOR AUTH AUTH CHECK
function authRequired(req, res, next) {
    if (!req.user) throw new Error("Potrebna je prijava u sustav");
    next();
}
// MIDDLEWARE FOR PARSING AUTH COOKIE 
function parseAuthCookie(req, res, next) {
    const token = req.cookies[process.env.ATUH_COOKIE_NAME];
    let result = null;
    try {
        result = jwt.verify(token, JWT_SECRET_KEY);
    } catch (error) {
        next();
        return;
    }
    req.user = result;
    res.locals.user = result;
    next();
}

function checkEmailUique(email){
    const stmt = db.prepare("SELECT count(*) FROM users WHERE email= ?;");
    const result = stmt.get(email);

    if (result["count(*)"] >= 1) {
        return false;
    }else{
        return true;
    }
}

module.exports = {
    getUserJwt,
    authRequired,
    parseAuthCookie,
    checkEmailUique
};