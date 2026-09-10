import { createBrowserRouter, createRoutesFromElements, Route, Routes } from "react-router";
import { RouterProvider } from "react-router/dom";
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import CodingPage from './pages/CodingPage';

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/coding" element={<CodingPage />} />
      {/* You can add a proper Room component later */}
      {/* <Route path="/room/:roomName" element={<div>Room Component Here</div>} /> */}
    </>
  )
);

function App() {
  return (
    <RouterProvider router={router}/>
  );
}

export default App;
