import { Box } from "@chakra-ui/react";
import { Navbar } from "./navbar/Navbar";
import { Footer } from "./footer/Footer";

export function Layout({ children }) {
    return (
        <Box display="flex" flexDirection="column" minH="100vh">
            <Navbar />

            <Box as="main" flex="1" p={{ base: "4", md: "8" }} maxW="7xl" mx="auto" width="full">
                {children}
            </Box>

            <Footer />
        </Box>
    );
}
