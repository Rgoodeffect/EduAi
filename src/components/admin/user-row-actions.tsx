"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@components/ui/input";
import { Button } from "@components/ui/button";

interface UserRowActionsProps {
  userId: string;
  roles: string[];
  isActive: boolean;
  isSelf: boolean;
}

export function UserRowActions({ userId, roles, isActive, isSelf }: UserRowActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const primaryRole = roles[0] ?? "STUDENT";

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={primaryRole}
        disabled={loading || isSelf}
        onChange={(e) => patch({ roles: [e.target.value] })}
        className="w-32 py-1 text-xs"
      >
        <option value="STUDENT">Student</option>
        <option value="TEACHER">Teacher</option>
        <option value="ADMIN">Admin</option>
      </Select>
      <Button
        size="sm"
        variant={isActive ? "outline" : "secondary"}
        loading={loading}
        disabled={isSelf}
        onClick={() => patch({ isActive: !isActive })}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}
