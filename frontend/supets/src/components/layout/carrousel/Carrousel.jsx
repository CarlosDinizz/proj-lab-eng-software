import { AspectRatio, Carousel, IconButton, Image } from "@chakra-ui/react";
import { LuArrowLeft, LuArrowRight } from "react-icons/lu";
import { Box } from "@chakra-ui/react"
import { forwardRef } from "react"

export function Carrousel({ images, resolucao }) {

    return (
    <Carousel.Root
      slideCount={images.length}
      mx="auto"
      gap="4"
      position="relative"
      colorPalette="white"
    >
      <Carousel.Control gap="4" width="full" position="relative">
        <Carousel.PrevTrigger asChild>
          <ActionButton insetStart="4">
            <LuArrowLeft />
          </ActionButton>
        </Carousel.PrevTrigger>

        <Carousel.ItemGroup width="full">
          {images.map((src, index) => (
            <Carousel.Item key={index} index={index}>
              <AspectRatio ratio={resolucao} w="full">
                <Image
                  src={src}
                  objectFit="contain"
                />
              </AspectRatio>
            </Carousel.Item>
          ))}
        </Carousel.ItemGroup>

        <Carousel.NextTrigger asChild>
          <ActionButton insetEnd="4">
            <LuArrowRight />
          </ActionButton>
        </Carousel.NextTrigger>

        <Box position="absolute" bottom="6" width="full">
          <Carousel.Indicators
            transition="width 0.2s ease-in-out"
            transformOrigin="center"
            opacity="0.5"
            boxSize="2"
            _current={{ width: "10", bg: "colorPalette.subtle", opacity: 1 }}
          />
        </Box>
      </Carousel.Control>
    </Carousel.Root>
  )
}


export const ActionButton = forwardRef(function ActionButton(props, ref) {
  return (
    <IconButton
      size="xs"
      variant="outline"
      rounded="full"
      position="absolute"
      zIndex="1"
      bg="bg"
      {...props}
      ref={ref}
    />
  );
});
