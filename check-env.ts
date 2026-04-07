import dotenv from 'dotenv';
dotenv.config();

console.log('--- ENV CHECK ---');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? 'DEFINED (starts with ' + process.env.STRIPE_SECRET_KEY.slice(0, 7) + ')' : 'NOT DEFINED');
console.log('CHAVE_SECRETA:', process.env.CHAVE_SECRETA ? 'DEFINED' : 'NOT DEFINED');
console.log('STRIPE_PRICE_ID:', process.env.STRIPE_PRICE_ID ? 'DEFINED' : 'NOT DEFINED');
console.log('ID_DO_PRECO:', process.env.ID_DO_PRECO ? 'DEFINED' : 'NOT DEFINED');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('-----------------');
