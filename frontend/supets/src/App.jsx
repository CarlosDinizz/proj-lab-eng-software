import './App.css'
import { Box, Flex } from '@chakra-ui/react'
import { Navbar } from './components/layout/navbar/Navbar'
import { Footer } from './components/layout/footer/Footer'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Login } from './components/login/Login'
import { Cadastro } from './components/cadastro/Cadastro'
import { Home } from './pages/home/Home'
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from './auth/AuthProvider'
import { RotaProtegida } from './auth/RotaProtegida'
import { NovaOcorrencia } from './components/ocorrencia/NovaOcorrencia'
import { ListaOcorrencias } from './components/ocorrencia/ListaOcorrencias'
import { DetalheOcorrencia } from './components/ocorrencia/DetalheOcorrencia'

function App() {
  return (
    <>
        <BrowserRouter>
            <AuthProvider>
                <Flex direction="column" minHeight="100vh">
                    <Navbar />
                    <Box as="main" flex="1">
                        <Routes>
                            <Route path="/login" element={<Login />}/>
                            <Route path="/cadastro" element={<Cadastro />} />
                            {/* UC003 e UC002 exigem login; UC001 é só para cidadão */}
                            <Route path="/ocorrencias" element={<RotaProtegida><ListaOcorrencias /></RotaProtegida>} />
                            <Route path="/ocorrencias/minhas" element={<RotaProtegida><ListaOcorrencias minhas /></RotaProtegida>} />
                            <Route path="/ocorrencias/nova" element={
                                <RotaProtegida perfil="CIDADAO"><NovaOcorrencia /></RotaProtegida>
                            } />
                            <Route path="/ocorrencias/:id" element={<RotaProtegida><DetalheOcorrencia /></RotaProtegida>} />
                            <Route path="/" element={<Home />}/>
                            <Route path="*" element={<Home />}/>
                        </Routes>
                    </Box>
                    <Toaster />
                    <Footer />
                </Flex>
            </AuthProvider>
        </BrowserRouter>
    </>

  )
}

export default App
