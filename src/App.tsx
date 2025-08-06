import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Home, Tutorial, Profile, EditProfile, NotFound, Landing, Welcome, Trade, ListCrypto, Settings, Language } from './pages';

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/home" element={<Home />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/tutorial" element={<Tutorial />} />
      <Route path="/trade" element={<Trade />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/edit-profile" element={<EditProfile />} />
      <Route path="/home/settings" element={<Settings />} />
      <Route path="/home/language" element={<Language />} />
      <Route path="/trade/list" element={<ListCrypto />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
)
