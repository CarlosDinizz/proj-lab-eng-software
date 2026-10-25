import './App.css'
import { Box, Flex } from '@chakra-ui/react'
import { Navbar } from './components/layout/navbar/Navbar'
import { Footer } from './components/layout/footer/Footer'
import { Home } from './pages/home/Home'
import { Login } from './components/login/Login'

function App() {

  return (
    <>
        <Flex direction="column" minHeight="100vh">
            <Navbar />

            <Box as="main" flex="1">
                <Login />
            </Box>

            <Footer />
        </Flex>
    </>

  )
}

export default App
