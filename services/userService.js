const userModel = require("../models/userModel");

const getUsers = () => {
  return userModel.findAll();
};

const getUserById = (userId) => {
  return userModel.findById(userId);
};

const createAtivo = (userId, nomeAtivo, quantidadeAtivos, valorAtivo) => {
  return userModel.createAtivo(userId, nomeAtivo, quantidadeAtivos, valorAtivo);
};

const getAtivos = (userId) => {
  return userModel.findAtivosByUserId(userId);
};

module.exports = {
  getUsers,
  getUserById,
  createAtivo,
  getAtivos,
};
