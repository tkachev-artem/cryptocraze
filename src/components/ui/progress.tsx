import * as React from "react"

type ProgressProps = {
  value?: number
} & React.HTMLAttributes<HTMLDivElement>

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className = '', value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={`relative h-4 w-full overflow-hidden rounded-full bg-gray-100 ${className}`}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-gray-900 transition-all"
        style={{ transform: `translateX(-${(100 - (value || 0)).toString()}%)` }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }
