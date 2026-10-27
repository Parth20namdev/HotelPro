import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { HotelProvider } from './ui/common'
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><HotelProvider><App /></HotelProvider></AuthProvider></BrowserRouter></React.StrictMode>)
