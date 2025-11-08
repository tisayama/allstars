interface TVBackgroundProps {
  animationsEnabled: boolean;
}

export function TVBackground({ animationsEnabled }: TVBackgroundProps) {
  return (
    <div className="tv-background-container">
      <div
        className={`tv-gradient ${animationsEnabled ? 'animated' : 'static'}`}
        style={{
          animationPlayState: animationsEnabled ? 'running' : 'paused',
        }}
      />
    </div>
  );
}
