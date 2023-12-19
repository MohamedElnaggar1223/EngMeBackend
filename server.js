// const express = require('express');
// const axios = require('axios');
// const cors = require('cors')
// const corsOptions = require('./corsOptions')

// const app = express();

// app.use(cors(corsOptions))

// const port = 3001;

// const axiosEndPoint = new axios.Axios()

// app.post('/authorize', async (req, res) => {
//     const data = await axiosEndPoint.post('https://zoom.us/oauth/authorize', null, {
//         params: {
//             'response_type': 200,
//             'redirect_uri': 'http://localhost:5173',
//             'client_id': 'FqfeomeMS7aDtXGgWwm3A'
//         },
//     })

//     console.log(data.data)
// })

// const ZOOM_API_KEY = 'YOUR_ZOOM_API_KEY';
// // const ZOOM_API_SECRET = 'YOUR_ZOOM_API_SECRET';

// // const axiosEndPoints = new axios.Axios()

// // // Endpoint to generate a Zoom meeting link
// // app.post('/create-meeting', async (req, res) => {
// //   try {
// //     const { startTime, endTime, studentId, teacherId } = req.body;

// //     // Use your logic to determine meeting details
// //     const meetingDetails = {
// //       topic: 'Consultation Session',
// //       type: 2, // Scheduled Meeting
// //       start_time: new Date(startTime).toISOString(),
// //       duration: Math.floor((endTime - startTime) / 60000), // in minutes
// //       // Add any other necessary parameters
// //     };

// //     // Make a request to Zoom API to create a meeting
// //     const zoomResponse = await axiosEndPoints.post(
// //       'https://api.zoom.us/v2/users/me/meetings',
// //       meetingDetails,
// //       {
// //         headers: {
// //           'Content-Type': 'application/json',
// //           Authorization: Bearer ${await getZoomAccessToken()},
// //         },
// //       }
// //     );

// //     const { join_url, id } = zoomResponse.data;

// //     // Save the Zoom meeting details in your database
// //     // ... Your database logic here ...

// //     res.json({ joinUrl: join_url, meetingId: id });
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).json({ error: 'Internal Server Error' });
// //   }
// // });

// // // Function to get a Zoom access token
// // async function getZoomAccessToken() {
// //   const response = await axios.post(
// //     'https://zoom.us/oauth/token',
// //     null,
// //     {
// //       params: {
// //         grant_type: 'client_credentials',
// //       },
// //       auth: {
// //         username: ZOOM_API_KEY,
// //         password: ZOOM_API_SECRET,
// //       },
// //     }
// //   );

// //   return response.data.access_token;
// }

// app.listen(port, () => {
//   console.log(Server is running on port ${port});
// });

require('dotenv').config()
const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors')
const corsOptions = require('./corsOptions')
const querystring = require('querystring')
const PORT = process.env.PORT || 3001


const REDIRECT_URI = 'http://localhost:3001/auth/callback';

const session = require('express-session');
const store = new session.MemoryStore()
const { v4: uuidv4 } = require('uuid');

app.use(session({
    secret: uuidv4(),
    resave: true,
    saveUninitialized: true,
    store,
    cookie: {
        sameSite: 'strict'
    }
}));

app.use(cors(corsOptions))
app.use(express.json())

const axiosEndPoint = new axios.Axios()

// let startTimeVar = ''
// let teacherEmail = ''

app.get('/start-zoom-auth', (req, res) => {
    const startTime = req.query.startTime
    const teacher = req.query.teacher
    //@ts-ignore
    if(!req.session?.startTimeVar){
        //@ts-ignore
        req.session.startTimeVar = startTime?.toString() ?? ""
    }
    //@ts-ignore
    req.session.teacherEmail = teacher?.toString() ?? ""
    res.json({link: `https://zoom.us/oauth/authorize?response_type=code&client_id=aDq5XQyeTFOuObuUlzvenA&redirect_uri=http://localhost:3001/auth/callback`})
    // console.log(req.session.startTimeVar)
    // console.log(req.sessionStore)
    res.end()
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

                // console.log(req.session.teacherEmail)
        
                const newMeeting = {
                    topic: 'Consultation Session',
                    type: 2,
                    //@ts-ignore
                    start_time: JSON.parse(Object.values(req.sessionStore.sessions)[0].split(" ")[0]).startTimeVar,
                    duration: 60,
                    timezone: 'Africa/Cairo',
                    agenda: 'Consultation Session',
                    //@ts-ignore
                    host_email: JSON.parse(Object.values(req.sessionStore.sessions)[0].split(" ")[0]).teacherEmail
                }

                fetch
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
                    req.sessionStore.set(Object.keys(req.sessionStore.sessions)[0], {...JSON.parse(Object.values(req.sessionStore.sessions)[0].split(" ")[0]), join_url: data.join_url})
                })
        
                // const newAxiosMeetingHeaders = new axios.AxiosHeaders({
                //     setAuthorization: `Bearer ${access_token}`,
                //     setContentType: 'application/json',
                // })
        
                // const newAxiosMeeting = new axios.Axios({
                //     headers: newAxiosMeetingHeaders
                // })

                // console.log(access_token)
        
                // const meeting = await newAxiosMeeting.post('https://api.zoom.us/v2/users/me/meetings', newMeeting, 
                //     {
                //         headers: {
                //             'Content-Type': 'application/json',
                //             Authorization: `Bearer ${access_token}`,
                //         },
                //     }
                // )
        
                // console.log(meeting.data)
            }
            catch(e)
            {
                console.log(e)
            }
        })
        
        
    }
    catch(e)
    {
        console.log(e)
    }
})

app.get('/joinurl', (req, res) => {
    res.json({ join_url: JSON.parse(Object.values(req.sessionStore.sessions)[0].split(" ")[0]).join_url })
    // res.redirect('http://localhost:5173')
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
// async function getAccessToken(code)
// {
//     axiosEndPoint.post('https://zoom.us/oauth/token', null, {
//         headers: {
//             Authorization: `Basic`
//         }
//     })
// }

// app.use(function (req, res, next) {
    //     res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    //     res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    //     res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
    //     next();
    // });
    
    // app.get('/start-zoom-auth', async (req, res) => {
        //     try {
            //         res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
            //         res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            //         res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
            //       // Redirect the user to Zoom for authentication
            //       res.redirect(`https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${REDIRECT_URI}`);
            //     } catch (error) {
                //       console.error(error);
                //       res.status(500).json({ error: 'Internal Server Error' });
                //     }
                //   });
                
                //   // Callback endpoint to exchange code for an access token
                //   app.get('/auth/callback', async (req, res) => {
                    //     const code = req.query.code;
                    
                    //     try {
                        //       // Exchange the code for an access token
                        //       const response = await axiosEndpoint.post('https://zoom.us/oauth/token', null, {
                            //         params: {
                                //           grant_type: 'authorization_code',
                                //           code,
                                //           redirect_uri: REDIRECT_URI,
                                //           client_id: ZOOM_CLIENT_ID,
                                //           client_secret: ZOOM_CLIENT_SECRET,
                                //         },
                                //       });
                                
                                //       const accessToken = response.data.access_token;
                                
                                //       // Use the access token to create a Zoom meeting
                                //       const meetingResponse = await axiosEndpoint.post('https://api.zoom.us/v2/users/me/meetings', {
                                    //         topic: 'Auto-generated Meeting',
                                    //         type: 2, // Scheduled Meeting
                                    //       }, {
                                        //         headers: {
                                            //           'Content-Type': 'application/json',
                                            //           Authorization: `Bearer ${accessToken}`,
                                            //         },
                                            //       });
                                            
                                            //       const joinUrl = meetingResponse.data.join_url;
                                            
                                            //       res.json({ joinUrl });
                                            //     } catch (error) {
                                                //       console.error(error);
                                                //       res.status(500).json({ error: 'Internal Server Error' });
                                                //     }
                                                //   });
                                                
                                                
                                                // app.get('/zoom-auth', (req, res) => {
                                                    //     res.redirect(`https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${REDIRECT_URI}`)
                                                    // })
                                                    
                                                    // // Endpoint to generate a Zoom meeting link
                                                    // app.post('/create-meeting', async (req, res) => {
                                                        //   try {
                                                            //     const { startTime, endTime } = req.body;
                                                            
                                                            //     const response = await axiosEndpoint.get('https://zoom.us/oauth/authorize', {
                                                                //         params: {
                                                                    //             'response_type': 'code',
                                                                    //             'redirect_uri': 'http://localhost:5173',
                                                                    //             'client_id': ZOOM_CLIENT_ID
                                                                    //         }
                                                                    //     })
                                                                    
                                                                    //     console.log(response)
                                                                    
                                                                    //     // console.log(new Date(endTime).getTime() , new Date(startTime).getTime())
                                                                    
                                                                    //     // Use your logic to determine meeting details
                                                                    //     const meetingDetails = {
                                                                        //       topic: 'Consultation Session',
                                                                        //       type: 2, // Scheduled Meeting
                                                                        //       start_time: new Date(startTime).toISOString(),
                                                                        //       duration: Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000), // in minutes
                                                                        //       // Add any other necessary parameters
                                                                        //     };
                                                                        
                                                                        //     // console.log(meetingDetails)
                                                                        
                                                                        //     // Make a request to Zoom API to create a meeting
                                                                        //     // const zoomResponse = await axiosEndpoint.post(
                                                                            //     //   'https://api.zoom.us/v2/users/me/meetings',
                                                                            //     //   meetingDetails,
                                                                            //     // ).catch(e => console.log(e))
                                                                            
                                                                            //     // console.log(zoomResponse)
                                                                            
                                                                            //     // const { join_url, id } = zoomResponse.data;
                                                                            
                                                                            //     // Save the Zoom meeting details in your database
                                                                            //     // ... Your database logic here ...
                                                                            
                                                                            //     // res.json({ joinUrl: join_url, meetingId: id });
                                                                            //   } catch (error) {
                                                                                //     console.error(error);
                                                                                //     res.status(500).json({ error: 'Internal Server Error' });
                                                                                //   }
                                                                                // });
                                                                                
                                                                                // // Function to get a Zoom access token using Zoom App credentials
                                                                                // async function getZoomAccessToken() {
                                                                                    //   const response = await axiosEndpoint.post(
                                                                                        //     'https://zoom.us/oauth/token'
                                                                                        //   );
                                                                                        
                                                                                        //   console.log(response.data)
                                                                                        
                                                                                        //   return response.data.access_token ?? "";
                                                                                        // }
                                                                                        
                                                                                        // app.listen(port, () => {
                                                                                            //   console.log(`Server is running on port ${port}`);
                                                                                            // });