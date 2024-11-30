export interface DeviceMotionEventSafari extends DeviceMotionEvent
{
    requestPermission?: RequestPermissionFunc;
};

export type RequestPermissionFunc = () => Promise<'granted' | 'denied'>;