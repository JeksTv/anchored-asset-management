import {adapter} from '../server/database.mjs';
export function database():D1Database{return adapter as unknown as D1Database;}
