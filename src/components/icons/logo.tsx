import Image from "next/image";

export function Logo({
  alt = "Tawjihi AI Logo",
  width = 80,
  height = 80,
  href,
  className = "",
  ...props
}: {
  alt?: string;
  width?: number;
  height?: number;
  href?: string;
  className?: string;
  [key: string]: any;
}) {
  const img = (
    <Image
      src="/logo.png" // ضع الصورة هنا داخل public
      alt={alt}
      width={width}
      height={height}
      className={"select-none " + className}
      {...props}
    />
  );

  if (href) {
    return (
      <a href={href} aria-label={alt} className="inline-block">
        {img}
      </a>
    );
  }

  return img;
}
