import bodyParser from 'body-parser';
import cors from 'cors';
import Datastore from '@google-cloud/datastore';
import Storage from '@google-cloud/storage';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import Parser from 'exif-parser';
import uuidV1 from 'uuid/v1';
import path from 'path';
import { sendError, sendOptions } from './utils';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const datastore = Datastore({
  projectId: 'andyspotting',
  keyFilename: 'key.json',
});
const storage = Storage({
  projectId: 'andyspotting',
  keyFilename: 'key.json',
});
const bucket = storage.bucket('andyspottingmedia');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

app.route('/')
  .get((req, res) => res.json({
    spottings: `${process.env.BASE_URL}/spottings`,
  }))
  .options(sendOptions(['HEAD', 'GET', 'OPTIONS']))
  .all(sendError(405));

app.route('/spottings')
  .get(async (req, res) => {
    const [spottings] = await datastore.createQuery('Spotting')
      .order('timestamp', { descending: true })
      .run();

    res.json(spottings.map(s => Object.assign(s, {
      id: s[datastore.KEY].name,
      url: `${process.env.BASE_URL}/spottings/${s[datastore.KEY].name}`,
      image: `https://storage.googleapis.com/andyspottingmedia/${s.image}`,
    })));
  })
  .post(upload.single('photo'), async (req, res) => {
    const parser = Parser.create(req.file.buffer);
    const metadata = parser.parse();
    const id = uuidV1();
    const extention = path.extname(req.file.originalname);
    const filename = id + extention;

    const image = bucket.file(filename);
    await image.save(req.file.buffer, { public: true });

    const timestamp = metadata.tags.DateTimeOriginal ?
      new Date(metadata.tags.DateTimeOriginal) : new Date();

    const location = datastore.geoPoint({
      latitude: metadata.tags.GPSLatitude || Number(req.body.latitude),
      longitude: metadata.tags.GPSLongitude || Number(req.body.longitude),
    });

    const entity = {
      key: datastore.key(['Spotting', id]),
      data: {
        timestamp,
        location,
        image: filename,
      },
    };

    await datastore.save(entity);
    return res.status(201)
      .location(`${process.env.BASE_URL}/spottings/${id}`)
      .json(Object.assign(entity.data, {
        id,
        url: `${process.env.BASE_URL}/spottings/${id}`,
        image: `https://storage.googleapis.com/andyspottingmedia/${filename}`,
      }));
  })
  .options(sendOptions(['HEAD', 'GET', 'POST', 'OPTIONS']))
  .all(sendError(405));

app.route('/spottings/:id')
  .get(async (req, res) => {
    const key = datastore.key(['Spotting', req.params.id]);
    const [result] = await datastore.get(key);

    res.json(Object.assign(result, {
      id: result[datastore.KEY].name,
      url: `${process.env.BASE_URL}/spottings/${result[datastore.KEY].name}`,
      image: `https://storage.googleapis.com/andyspottingmedia/${result.image}`,
    }));
  })
  .delete(async (req, res) => {
    const key = datastore.key(['Spotting', req.params.id]);
    const [sighting] = await datastore.get(key);
    const imageDelete = bucket.file(sighting.image).delete();
    await datastore.delete(key);
    await imageDelete;
    res.status(204).end();
  })
  .options(sendOptions(['HEAD', 'GET', 'DELETE', 'OPTIONS']))
  .all(sendError(405));

app.route('*')
  .all(sendError(404));

app.listen(80);
