const express = require("express");
const router = express.Router();
const { authRequired, adminRequired, checkEmailUnique } = require("../services/auth.js");
const Joi = require("joi");
const { db } = require("../services/db.js");

// GET /seminari
router.get("/", authRequired, function (req, res, next) {
    const stmt = db.prepare(`
        SELECT s.id, s.name, s.description, u.name AS author, s.apply_till, s.term
        FROM seminari s, users u
        WHERE s.author_id = u.id
        ORDER BY s.apply_till
    `);

    const result = stmt.all();

    res.render("seminari/index", { result: { items: result } });
});

// SCHEMA id
const schema_id = Joi.object({
    id: Joi.number().integer().positive().required()
});

// GET /seminari/delete/:id
router.get("/delete/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt1 = db.prepare("DELETE FROM s_apply WHERE id_seminara=?;");
    const deleteResult1 = stmt1.run(req.params.id);

    const stmt = db.prepare("DELETE FROM seminari WHERE id=?;");
    const deleteResult = stmt.run(req.params.id);

    if (!deleteResult.changes || deleteResult.changes !== 1) {
        throw new Error("Operacija nije uspjela");
    }
    res.redirect("/seminari");
});

// GET /seminari/edit/:id
router.get("/edit/:id", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }
    const stmt = db.prepare("SELECT * FROM seminari WHERE id = ?;");
    const selectResult = stmt.get(req.params.id);

    if (!selectResult) {
        throw new Error("Neispravan poziv");
    }

    res.render("seminari/form", { result: { display_form: true, edit: selectResult } });
});

// SCHEMA edit
const schema_edit = Joi.object({
    id: Joi.number().integer().positive().required(),
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required(),
    term: Joi.number().integer().min(1).max(60).required()
});
// GET /seminari/edit
router.post("/edit", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_edit.validate(req.body);
    if (result.error) {
        res.render("seminari/form", { result: { validation_error: true, display_form: true } });
        return;
    }

    const stmt = db.prepare("UPDATE seminari SET name = ?, description = ?, apply_till = ?, term = ? WHERE id = ?;");
    const updateResult = stmt.run(req.body.name, req.body.description, req.body.apply_till,req.body.term, req.body.id);

    if (updateResult.changes && updateResult.changes === 1) {
        res.redirect("/seminari");
    } else {
        res.render("seminari/form", { result: { database_error: true } });
    }
});

// GET /seminari/add
router.get("/add", adminRequired, function (req, res, next) {
    res.render("seminari/form", { result: { display_form: true } });
});

// SCHEMA add
const schema_add = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().min(3).max(1000).required(),
    apply_till: Joi.date().iso().required(),
    term: Joi.number().integer().min(1).max(60).required(),
});

// POST /seminari/add
router.post("/add", adminRequired, function (req, res, next) {
    // do validation
    const result = schema_add.validate(req.body);
    if (result.error) {
        res.render("seminari/form", { result: { validation_error: true, display_form: true } });
        return;
    }

    const stmt = db.prepare("INSERT INTO seminari (name, description, author_id, apply_till, term) VALUES (?, ?, ?, ?, ?);");
    const insertResult = stmt.run(req.body.name, req.body.description, req.user.sub, req.body.apply_till, req.body.term);

    if (insertResult.changes && insertResult.changes === 1) {
        res.render("seminari/form", { result: { success: true } });
    } else {
        res.render("seminari/form", { result: { database_error: true } });
    }
});

// GET /seminari/apply/:id
router.get("/apply/:id", function (req, res, next) {

    // do validation
    const result = schema_id.validate(req.params);
    if (result.error) {
        throw new Error("Neispravan poziv");
    }
    const stmt1 = db.prepare("SELECT * FROM s_apply WHERE id_korisnika =? AND id_seminara = ?;");
    const selectResult = stmt1.all(req.user.sub, req.params.id);

    if (selectResult.length > 0) {
        throw new Error("Već ste prijavljeni!");
    }
    else {

        const stmt = db.prepare("INSERT INTO s_apply (id_korisnika, id_seminara) VALUES (?, ?);");
        const insertResult = stmt.run(req.user.sub, req.params.id);

        if (insertResult.changes && insertResult.changes === 1) {
            res.render("seminari/form", { result: { success: true } });
        } else {
            res.render("seminari/form", { result: { database_error: true } });
        }
    }
});

// GET /seminari/applyed/:id
router.get("/applyed/:id", adminRequired, function (req, res, next) {
    // do validation
    const result1 = schema_id.validate(req.params);
    if (result1.error) {
        throw new Error("Neispravan poziv");
    }

    const stmt = db.prepare(`
    SELECT s_a.id, s.name as semName, u.name as korisnik
    FROM s_apply s_a, seminari s, users u
    WHERE s_a.id_seminara = s.id and s_a.id_korisnika = u.id and s.id = ?
    `);

    const result = stmt.all(req.params.id);

    res.render("seminari/apply", { result: { items: result } });

});

module.exports = router;