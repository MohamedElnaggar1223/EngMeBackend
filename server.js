require('dotenv').config()
const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors')
const corsOptions = require('./corsOptions')
const querystring = require('querystring')
const PORT = process.env.PORT || 3001

const REDIRECT_URI = 'https://engmebackendzoom.onrender.com/auth/callback';

var admin = require("firebase-admin");

var serviceAccount = {
    type: process.env.type,
    project_id: process.env.project_id,
    private_key_id: process.env.private_key_id,
    //@ts-ignore
    private_key: process.env.private_key.replace(/\\n/g, '\n'),
    client_email: process.env.client_email,
    client_id: process.env.client_id,
    auth_uri: process.env.auth_uri,
    token_uri: process.env.token_uri,
    auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
    client_x509_cert_url: process.env.client_x509_cert_url,
    universe_domain: process.env.universe_domain,
}

admin.initializeApp({
    //@ts-ignore
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.project_id
})


const session = require('express-session');
const store = new session.MemoryStore()
const { v4: uuidv4 } = require('uuid');

app.use(session({
    secret: uuidv4(),
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
        sameSite: 'strict'
    }
}));

app.use(cors())
app.use(express.json())

const axiosEndPoint = new axios.Axios()

let consultationId = ''
let startTime = ''

app.get('/', (req, res) => {
    return res.status(200).json('initiated server connection')
})

app.get('/start-zoom-auth', (req, res) => {
    // if(consultationId || startTime)
    // {
    //     return res.json({link: null})
    // }
    const start = req.query.startTime
    // const teacher = req.query.teacher
    const consultation = req.query.consultationId
    //@ts-ignore
    // if(!req.session?.startTimeVar){
    //     //@ts-ignore
    //     req.session.startTimeVar = startTime?.toString() ?? ""
    // }
    startTime = start?.toString() ?? ""
    //@ts-ignore
    // req.session.teacherEmail = teacher?.toString() ?? ""
    //@ts-ignore
    consultationId = consultation?.toString() ?? ""
    // console.log(req.session.consultationId)
    res.json({link: `https://zoom.us/oauth/authorize?response_type=code&client_id=Kg8pxdyqTCCabjYCgU5xeQ&redirect_uri=${REDIRECT_URI}`})
    return res.end()
})

app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    
    
    try 
    {
        const newAxiosHeaders = new axios.AxiosHeaders({
            setAuthorization: `Basic ${Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64')}`,
            setContentType: 'application/x-www-form-urlencoded',
        })

        const newAxios = new axios.Axios({
            headers: newAxiosHeaders
        })
        // Exchange the code for an access token
        await newAxios.post('https://zoom.us/oauth/token', 
        querystring.stringify({
                grant_type: 'authorization_code',
                code: code?.toString(),
                redirect_uri: REDIRECT_URI,
                client_id: process.env.ZOOM_CLIENT_ID,
                client_secret: process.env.ZOOM_CLIENT_SECRET
            })
        ).then(async (data) => {
            try
            {
                const { access_token } = JSON.parse(data.data)
        
                const newMeeting = {
                    topic: 'Consultation Session',
                    type: 2,
                    //@ts-ignore
                    // start_time: JSON.parse(Object.values(req.sessionStore.sessions)[0].split(" ")[0]).startTimeVar,
                    start_time: startTime,
                    duration: 60,
                    timezone: 'Africa/Cairo',
                    agenda: 'Consultation Session',
                    //@ts-ignore
                    // host_email: JSON.parse(Object.values(req.sessionStore.sessions)[0].split(" ")[0]).teacherEmail
                }

                await fetch
                (
                    'https://api.zoom.us/v2/users/me/meetings',
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${access_token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(newMeeting)
                    }
                )
                .then(response => response.json())
                .then(data => {
                    //@ts-ignore
                    // req.sessionStore.set(Object.keys(req.sessionStore.sessions)[0], {...JSON.parse(Object.values(req.sessionStore.sessions)[0].split(" ")[0]), join_url: data.join_url})
                    const db = admin.firestore()
                    // console.log('values: ', Object.values(req.sessionStore.sessions))
                    // console.log('valuesNoStore: ', req.sessionStore.sessions)
                    // console.log('valuesparsed: ', JSON.parse(Object.values(req.sessionStore.sessions)[0]))
                    //@ts-ignore
                    // const consultationId = JSON.parse(Object.values(req.sessionStore.sessions)[1].split(" ")[0]).consultationId
                    // const consultation = consultationId
                    const consultationRef = db.collection('consultationSessions').doc(consultationId);

                    consultationRef.update({ meetingLink: data.join_url })
                }).then(() => {
                    //@ts-ignore
                    // req.session.destroy(() => req.sessionStore.destroy(Object.keys(req.sessionStore.sessions)[0]))
                    startTime = ''
                    consultationId = ''
                    res.redirect("https://engme.org")
                    return res.end()
                })

            }
            catch(e)
            {
                // req.session.destroy(() => req.sessionStore.destroy(Object.keys(req.sessionStore.sessions)[0]))
                res.redirect("https://engme.org")
                res.end()
                console.log(e)
            }
        })
        
        
    }
    catch(e)
    {
        console.log(e)
    }
})

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
