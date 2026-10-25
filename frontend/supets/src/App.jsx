import './App.css'
import { Box, Flex } from '@chakra-ui/react'
import { Navbar } from './components/layout/navbar/Navbar'
import { Footer } from './components/layout/footer/Footer'

function App() {

  return (
    <>
        <Flex direction="column" minHeight="100vh">
            <Navbar />

            <Box as="main" flex="1">

            </Box>

            <Footer />
        </Flex>
    </>

  )
}

export default App
