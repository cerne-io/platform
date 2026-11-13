export interface NavigationItem {
    name: string;
    href?: string;
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    tooltip?: string;
    children?: NavigationItem[];
    dataTour?: string;
}

export const isNavItemActive = (item: NavigationItem, pathname: string): boolean => {
    return item.href ? pathname === item.href : false;
};

export const isChildActive = (item: NavigationItem, pathname: string): boolean => {
    return item.children?.some(child => child.href && pathname === child.href) ?? false;
};
