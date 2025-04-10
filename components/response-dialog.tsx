"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { X } from "lucide-react";

interface ResponseDialogProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  response: any;
}

export function ResponseDialog({
  title,
  isOpen,
  onClose,
  response,
}: ResponseDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-3 rounded-md overflow-auto max-h-[60vh]">
            <pre className="text-xs whitespace-pre-wrap break-all">
              {typeof response === "string"
                ? response
                : JSON.stringify(response, null, 2)}
            </pre>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={onClose}>关闭</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
