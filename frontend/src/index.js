import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import RoomPage from './RoomPage';
import VideoCallPage from './VideoCallPage';
import AppComponent from './Components/App';
import GroupChat from './GroupChat';
import FileEditor from './FileEditor';
import Handler from './Handler';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppComponent />} />
        <Route path='/dashboard' element={<Dashboard/>}/>
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="/room/:roomId/video-call" element={<VideoCallPage/>} />
        <Route path="/room/:roomId/chat" element={<GroupChat />} />
        <Route path="/code-editor" element={<FileEditor />} />
        <Route path="/homepage" element={<Handler/>}/>
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
