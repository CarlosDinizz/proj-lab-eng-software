import './App.css'
import { Box, Flex } from '@chakra-ui/react'
import { Navbar } from './components/layout/navbar/Navbar'
import { Footer } from './components/layout/footer/Footer'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Login } from './components/login/Login'
import { Cadastro } from './components/cadastro/Cadastro'
import { Home } from './pages/home/Home'

function App() {
  return (
    <>
        <BrowserRouter>
            <Flex direction="column" minHeight="100vh">
                <Navbar />

                <Box as="main" flex="1">
                    <Routes>
                        <Route path="/login" element={<Login />}/>
                        <Route path="/cadastro" element={<Cadastro />} />
                        <Route path="/" element={<Home />}/>
                        <Route path="*" element={<Home />}/>
                    </Routes>
                </Box>

                <Footer />
            </Flex>
        </BrowserRouter>
    </>

  )
}

export default App
