const express = require('express');
const router = require('express-promise-router')();
const QuestionController = require('../controllers/questions');


router.route('/get:id')
  .get(validateBody(schemas.authSchema), UsersController.signUp);

module.exports = router;

