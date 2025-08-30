import { lazy } from 'react'

// Core pages loaded immediately for better UX
export { Welcome } from './Welcome';

// Heavy pages lazy loaded for better performance
export const Home = lazy(() => import('./Home/Home').then(module => ({ default: module.Home })))
export const Tutorial = lazy(() => import('./Tutorial').then(module => ({ default: module.Tutorial })))
export const Profile = lazy(() => import('./Profile/Profile').then(module => ({ default: module.Profile })))
export const EditProfile = lazy(() => import('./Profile/EditProfile'))
export const Landing = lazy(() => import('./Landing').then(module => ({ default: module.Landing })))
export const Trade = lazy(() => import('./Trade/Trade'))
export const ListCrypto = lazy(() => import('./Trade/ListCrypto'))
export const Settings = lazy(() => import('./Home/Settings'))
export const Language = lazy(() => import('./Home/Language'))
export const NotFound = lazy(() => import('./NotFound').then(module => ({ default: module.NotFound })))
export const Notifications = lazy(() => import('./Home/Notifications'))
export const Share = lazy(() => import('./Home/Share'))
export const Premium = lazy(() => import('./Home/Premium'))
export const DealList = lazy(() => import('./Deal/DealList').then(module => ({ default: module.DealList })))
export const Rating = lazy(() => import('./Home/Rating'))
export const Rewards = lazy(() => import('./Rewards'))
export const TradePro = lazy(() => import('./Trade/Pro'))
export const Live = lazy(() => import('./Live'))
export const Trials = lazy(() => import('./Trials').then(module => ({ default: module.Trials })))
