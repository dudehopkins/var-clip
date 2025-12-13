const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/30 backdrop-blur-sm py-3 px-6">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} varsclip by dudeperfect • All Rights Reserved
        </p>
      </div>
    </footer>
  );
};

export { Footer };
