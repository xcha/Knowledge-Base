"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/Loading";
import { Plus, Save, Trash2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      const res = await adminApi.getConfigs();
      setConfigs(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(key: string, value: string) {
    setSaving(true);
    try {
      await adminApi.setConfig(key, value);
      await loadConfigs();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`确定删除配置项 "${key}"？`)) return;
    await adminApi.deleteConfig(key);
    await loadConfigs();
  }

  async function handleAdd() {
    if (!newKey.trim()) return;
    await handleSave(newKey.trim(), newValue);
    setNewKey("");
    setNewValue("");
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">管理系统配置项</p>
      </div>

      {/* 添加新配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">添加配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="配置键"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="max-w-xs"
            />
            <Input
              placeholder="配置值"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={!newKey.trim()}>
              <Plus className="size-4 mr-2" />
              添加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 配置列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">配置项</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(configs).length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无配置项</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(configs).map(([key, value]) => (
                <ConfigItem
                  key={key}
                  configKey={key}
                  value={value}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  saving={saving}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigItem({
  configKey,
  value,
  onSave,
  onDelete,
  saving,
}: {
  configKey: string;
  value: string;
  onSave: (key: string, value: string) => void;
  onDelete: (key: string) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
      <Label className="min-w-[150px] font-mono text-sm">{configKey}</Label>
      {editing ? (
        <>
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 h-8"
          />
          <Button
            size="sm"
            onClick={() => {
              onSave(configKey, editValue);
              setEditing(false);
            }}
            disabled={saving}
          >
            <Save className="size-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(false);
              setEditValue(value);
            }}
          >
            取消
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm truncate">{value}</span>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            编辑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => onDelete(configKey)}
          >
            <Trash2 className="size-3" />
          </Button>
        </>
      )}
    </div>
  );
}
