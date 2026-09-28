import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import {defineConfig,loadEnv} from 'vite';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'APP_');
 const appOrigin=process.env.APP_ORIGIN||env.APP_ORIGIN||'http://localhost:3000';
 process.env.APP_ORIGIN=appOrigin;
 return {css:{postcss:{plugins:[tailwindcss()]}},plugins:[vinext()],server:{host:'127.0.0.1',allowedHosts:[new URL(appOrigin).hostname]}};
});
