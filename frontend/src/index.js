import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './login';
import Signup from './register';
import Dashboard from './Dashboard';
import RoomPage from './RoomPage';
import VideoCallPage from './VideoCallPage';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signup/>} />
        <Route path='/login' element={<Login />}/>
        <Route path='/dashboard' element={<Dashboard/>}/>
        <Route path="/rooms/:roomId" element={<RoomPage />} />
        <Route path="/room/:roomId/video-call" element={<VideoCallPage/>} />
      </Routes>
    </Router>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
