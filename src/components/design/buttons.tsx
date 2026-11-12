import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

export function PrimaryButton({ className, ...props }: ButtonProps) {
  return <Button className={cn("ds-button ds-button-primary", className)} {...props} />;
}

export function SecondaryButton({ className, ...props }: ButtonProps) {
  return <Button variant="outline" className={cn("ds-button ds-button-secondary", className)} {...props} />;
}
