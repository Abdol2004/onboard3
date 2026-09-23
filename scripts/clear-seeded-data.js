require('dotenv').config();
const mongoose = require('mongoose');

async function clear() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected');

  const PathwayContent   = require('../models/PathwayContent');
  const PathwayComment   = require('../models/PathwayComment');
  const AcademyCohort    = require('../models/AcademyCohort');
  const AcademyEnrollment = require('../models/AcademyEnrollment');
  const AcademyApplication = require('../models/AcademyApplication');
  const AcademyCertificate = require('../models/AcademyCertificate');

  const pc  = await PathwayContent.deleteMany({});
  const pcm = await PathwayComment.deleteMany({});
  const co  = await AcademyCohort.deleteMany({});
  const en  = await AcademyEnrollment.deleteMany({});
  const ap  = await AcademyApplication.deleteMany({});
  const ce  = await AcademyCertificate.deleteMany({});

  console.log(`PathwayContent:    ${pc.deletedCount} deleted`);
  console.log(`PathwayComment:    ${pcm.deletedCount} deleted`);
  console.log(`AcademyCohort:     ${co.deletedCount} deleted`);
  console.log(`AcademyEnrollment: ${en.deletedCount} deleted`);
  console.log(`AcademyApplication:${ap.deletedCount} deleted`);
  console.log(`AcademyCertificate:${ce.deletedCount} deleted`);

  await mongoose.disconnect();
  console.log('Done');
}

clear().catch(e => { console.error(e); process.exit(1); });
