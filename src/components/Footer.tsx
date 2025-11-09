const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/30 backdrop-blur-sm py-4 px-6 text-center">
      <p className="text-sm text-muted-foreground">
        © {new Date().getFullYear()} varsclip by dudeperfect
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        All Rights Reserved
      </p>
    </footer>
  );
};

export { Footer };
