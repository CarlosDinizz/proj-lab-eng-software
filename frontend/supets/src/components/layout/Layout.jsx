import { Box } from "@chakra-ui/react";

export function Layout({ children }) {
    return (
        <Box display="flex" flexDirection="column">
            <Box as="main" flex="1" p={{ base: "4", md: "8" }} maxW="7xl" mx="auto" width="full">
                {children}
            </Box>
        </Box>
    );
}
