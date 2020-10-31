const converter = require('number-to-words');
const bcrypt = require('bcryptjs');
const User = require('./models/user');
const Appt = require('./models/appt');
const Room = require('./models/room');
const Med = require('./models/med');

function newDateAddDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function generateClients() {
  const results = [];
  for (let i = 1; i <= 30; i += 1) {
    results.push(User.create({
      email: `client${i}@email.com`,
      password: bcrypt.hashSync(`password${i}`, 8),
      firstname: `firstname${converter.toWords(i)}`,
      lastname: `lastname${converter.toWords(i)}`,
      birth: new Date().toISOString().split('T')[0],
      gender: (i % 2) ? 'female' : 'male',
      role: 'client',
    }));
  }
  return Promise.all(results);
}

function generateSecs() {
  const results = [];
  for (let i = 1; i <= 10; i += 1) {
    results.push(User.create({
      email: `sec${i}@email.com`,
      password: bcrypt.hashSync(`password${i}`, 8),
      firstname: `firstname${converter.toWords(i)}`,
      lastname: `lastname${converter.toWords(i)}`,
      birth: new Date().toISOString().split('T')[0],
      gender: (i % 2) ? 'female' : 'male',
      role: 'sec',
    }));
  }
  return Promise.all(results);
}

function generateDoctors() {
  const results = [];
  for (let i = 1; i <= 10; i += 1) {
    results.push(User.create({
      email: `doctor${i}@email.com`,
      password: bcrypt.hashSync(`password${i}`, 8),
      firstname: `firstname${converter.toWords(i)}`,
      lastname: `lastname${converter.toWords(i)}`,
      birth: new Date().toISOString().split('T')[0],
      gender: (i % 2) ? 'female' : 'male',
      role: 'doctor',
    }));
  }
  return Promise.all(results);
}

function generateAdmin() {
  return User.create({
    email: 'admin@email.com',
    password: bcrypt.hashSync('password', 8),
    firstname: 'firstname',
    lastname: 'lastname',
    birth: new Date().toISOString().split('T')[0],
    gender: 'male',
    role: 'admin',
  });
}

function generateAppts(clients, doctors) {
  const results = [];
  for (let i = 0; i < 10; i += 1) {
    const date = newDateAddDays(Math.floor(Math.random() * 31));
    results.push(Appt.create({
      client: clients[i]._id,
      doctor: doctors[i]._id,
      at: date.toISOString().split('T')[0],
      slot: 1,
    }));
  }
  return Promise.all(results);
}

function updateClientsAppts(clients, appts) {
  const results = [];
  let i = 0;
  appts.forEach((appt) => {
    clients[i].appts.push(appt._id);
    results.push(clients[i].save());
    i += 1;
  });
  return Promise.all(results);
}

function updateDocsAppts(docs, appts) {
  const results = [];
  let i = 0;
  appts.forEach((appt) => {
    docs[i].appts.push(appt._id);
    results.push(docs[i].save());
    i += 1;
  });
  return Promise.all(results);
}

function generateRooms(clients, doctors) {
  const results = [];
  for (let i = 0; i < 10; i += 1) {
    const date = newDateAddDays(i + 1);
    results.push(Room.create({
      client: clients[i]._id,
      doctor: doctors[i]._id,
      number: (i + 1),
      start: date.toISOString().split('T')[0],
      end: date.toISOString().split('T')[0],
    }));
  }
  return Promise.all(results);
}

function updateClientsRoom(clients, rooms) {
  const results = [];
  let i = 0;
  rooms.forEach((room) => {
    clients[i].room = room._id;
    results.push(clients[i].save());
    i += 1;
  });
  return Promise.all(results);
}

function updateDocsRoom(docs, rooms) {
  const results = [];
  let i = 0;
  rooms.forEach((room) => {
    docs[i].room = room._id;
    results.push(docs[i].save());
    i += 1;
  });
  return Promise.all(results);
}

function generateMeds(clients) {
  const results = [];
  for (let i = 0; i < 10; i += 1) {
    const date1 = newDateAddDays(i + 1);
    const date2 = newDateAddDays(i + 2);
    results.push(Med.create({
      name: `medicine${i + 1}`,
      start: date1.toISOString().split('T')[0],
      end: date2.toISOString().split('T')[0],
      instr: `Using instructions for a medine${i + 1}.`,
      client: clients[i]._id,
    }));
  }
  return Promise.all(results);
}

function updateClientsMeds(clients, meds) {
  const results = [];
  let i = 0;
  meds.forEach((med) => {
    clients[i].meds.push(med._id);
    results.push(clients[i].save());
    i += 1;
  });
  return Promise.all(results);
}

module.exports = async function seedDB() {
  try {
    await User.deleteMany({});
    await Appt.deleteMany({});
    await Room.deleteMany({});
    await Med.deleteMany({});

    const clients = await generateClients();
    await generateSecs();
    const docs = await generateDoctors();
    await generateAdmin();

    const appts = await generateAppts(clients, docs);
    await updateClientsAppts(clients, appts);
    await updateDocsAppts(docs, appts);

    const rooms = await generateRooms(clients, docs);
    await updateClientsRoom(clients, rooms);
    await updateDocsRoom(docs, rooms);

    const meds = await generateMeds(clients);
    await updateClientsMeds(clients, meds);
  } catch (err) { console.error(err); }
};
