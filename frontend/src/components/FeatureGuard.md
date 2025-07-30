# FeatureGuard Component Usage Guide

The `FeatureGuard` component provides a clean way to conditionally render UI elements based on user roles and permissions using your existing feature guard functions.

## Installation

The component is already available at `@/components/FeatureGuard`.

## Basic Usage

### 1. Component Wrapper (Most Common)

```tsx
import { FeatureGuard } from '@/components/FeatureGuard';
import { canEditAsociaciones, canAccessCategorias } from '@/utils/featureGuards';

// Hide/show entire components
<FeatureGuard guard={canEditAsociaciones}>
  <Button type="primary">Create New Association</Button>
</FeatureGuard>

// Show edit buttons only for authorized users
<FeatureGuard guard={canAccessCategorias}>
  <Space>
    <Button>Edit</Button>
    <Button danger>Delete</Button>
  </Space>
</FeatureGuard>
```

### 2. With Fallback Content

```tsx
<FeatureGuard 
  guard={canEditAsociaciones}
  fallback={<Text type="secondary">You don't have permission to edit</Text>}
>
  <EditForm />
</FeatureGuard>

// Or show different content based on permissions
<FeatureGuard 
  guard={canAccessCategorias}
  fallback={<Button disabled>Edit (No Permission)</Button>}
>
  <Button type="primary">Edit Category</Button>
</FeatureGuard>
```

### 3. Hook Version (For Complex Logic)

```tsx
import { useFeatureGuard } from '@/components/FeatureGuard';

function MyComponent() {
  const canEdit = useFeatureGuard(canEditAsociaciones);
  const canView = useFeatureGuard(canViewAsociaciones);
  
  return (
    <div>
      {canView && <DataTable />}
      {canEdit && (
        <Space>
          <Button>Add New</Button>
          <Button>Bulk Edit</Button>
        </Space>
      )}
      {!canView && <Empty description="Access denied" />}
    </div>
  );
}
```

### 4. Higher-Order Component (For Entire Components)

```tsx
import { withFeatureGuard } from '@/components/FeatureGuard';
import { isAdmin } from '@/utils/featureGuards';

const AdminPanel = () => (
  <div>
    <h2>Admin Controls</h2>
    <Button danger>Delete All</Button>
  </div>
);

// Wrap the entire component
const ProtectedAdminPanel = withFeatureGuard(
  AdminPanel, 
  isAdmin,
  <Text type="secondary">Admin access required</Text>
);

// Use anywhere
<ProtectedAdminPanel />
```

## Common Patterns

### 1. Conditional Menu Items

```tsx
// In MainLayout or similar
<Menu items={[
  {
    key: "search",
    label: <Link href="/search">Search</Link>,
    icon: <SearchOutlined />,
  },
  // Conditionally show admin menu
  ...(useFeatureGuard(isAdmin) ? [{
    key: "admin",
    label: "Admin Panel",
    icon: <SettingOutlined />,
    children: [
      {
        key: "users",
        label: <Link href="/admin/users">Users</Link>,
      }
    ]
  }] : [])
]} />
```

### 2. Conditional Form Fields

```tsx
<Form>
  <Form.Item name="title" label="Title">
    <Input />
  </Form.Item>
  
  <FeatureGuard guard={canEditAsociaciones}>
    <Form.Item name="advanced" label="Advanced Settings">
      <Switch />
    </Form.Item>
  </FeatureGuard>
  
  <FeatureGuard guard={isAdmin}>
    <Form.Item name="systemLevel" label="System Level Config">
      <Select options={systemOptions} />
    </Form.Item>
  </FeatureGuard>
</Form>
```

### 3. Conditional Table Actions

```tsx
const columns = [
  // ... other columns
  {
    title: 'Actions',
    key: 'actions',
    render: (_, record) => (
      <Space>
        <Button>View</Button>
        
        <FeatureGuard guard={canEditAsociaciones}>
          <Button type="primary">Edit</Button>
        </FeatureGuard>
        
        <FeatureGuard guard={isAdmin}>
          <Button danger>Delete</Button>
        </FeatureGuard>
      </Space>
    ),
  },
];
```

### 4. Conditional Page Sections

```tsx
function DashboardPage() {
  return (
    <div>
      {/* Everyone sees this */}
      <SummaryCards />
      
      {/* Only specific roles see these sections */}
      <FeatureGuard guard={canViewAsociaciones}>
        <AssociationsSection />
      </FeatureGuard>
      
      <FeatureGuard guard={canAccessCategorias}>
        <CategoriesManagement />
      </FeatureGuard>
      
      <FeatureGuard guard={isAdmin}>
        <SystemMetrics />
      </FeatureGuard>
    </div>
  );
}
```

## Available Guard Functions

From your `featureGuards.ts`:

```tsx
// Role checks
isAdmin(role)
isGeneralOperator(role)
isObyaOperator(role)
isFullView(role)
isFullViewRestrict(role)

// Feature-specific guards
canSearchExp(role)
canSearchDocs(role) 
canDownloadDocsAll(role)
canViewAsociaciones(role)
canEditAsociaciones(role)
canAccessCategorias(role)
```

## Adding New Feature Guards

1. **Add to featureGuards.ts:**
```tsx
export const canCreateReports = (role: Role) =>
  isAdmin(role) || isFullView(role);

export const canExportData = (role: Role) =>
  isAdmin(role) || isObyaOperator(role);
```

2. **Use immediately:**
```tsx
<FeatureGuard guard={canCreateReports}>
  <Button>Generate Report</Button>
</FeatureGuard>
```

## Testing Override

For development/testing, you can override the role:

```tsx
// Test with different roles
<FeatureGuard guard={canEditAsociaciones} overrideRole="admin">
  <EditButton />
</FeatureGuard>

<FeatureGuard guard={canEditAsociaciones} overrideRole="authenticated">
  <EditButton />
</FeatureGuard>
```

## Best Practices

1. **Use semantic guard functions**: Prefer `canEditAsociaciones` over `isAdmin` for better maintainability
2. **Provide fallbacks when needed**: For better UX, show disabled states or explanatory text
3. **Keep guards close to the UI**: Don't nest multiple FeatureGuards unnecessarily
4. **Use the hook for complex logic**: When you need multiple permission checks
5. **Test with different roles**: Use the override feature during development

## Performance Notes

- The component uses `useSession` internally, so it's reactive to session changes
- Guards are called on every render, so keep guard functions lightweight
- For expensive permission calculations, consider memoization in the guard functions