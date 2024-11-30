import { DeviceMotionEventSafari, RequestPermissionFunc } from "./DeviceMotionEventSafari";

async function getCurrentPosition () 
{
    const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
    };

    return new Promise( (resolve: (v:GeolocationPosition) => void, reject:(r:GeolocationPositionError) => void) => {
        const success = (position: GeolocationPosition) => resolve(position);
        const failure = (error: GeolocationPositionError) => reject(error);
        navigator.geolocation.getCurrentPosition( success, failure, options );
    } )
}

function refreshGeolocationDisplay ()
{
    const locationDisplayDiv = document.getElementById( "location-display" );
    getCurrentPosition()
    .then( position => {
        locationDisplayDiv!.innerText = `Got ${position.coords.latitude}, ${position.coords.longitude}`;
    } )
    .catch( error => {
        locationDisplayDiv!.innerText = JSON.stringify( { code: error.code, message: error.message } );
    } );
}

function toKph( velocity: number )
{
    return velocity * 3.6;
}

function updatePositionDisplay ( position: { coords: { latitude: any; longitude: any; speed: any; }; } )
{
    const locationDisplayDiv = document.getElementById( "location-display" );
    locationDisplayDiv!.innerText = `Got ${position.coords.latitude}, ${position.coords.longitude}`;

    setOdometerValue(position.coords.speed);
    
}

function setOdometerValue( velocity: any )
{
    const roundSpeed = Math.round(toKph(velocity));
    document.getElementById( 'odometer-unit' )!.innerText = `${roundSpeed % 10}`;
    document.getElementById( 'odometer-tens' )!.innerText = `${Math.floor(roundSpeed / 10)}`;
    const speedDisplayDiv = document.getElementById( "speed-display" );
    speedDisplayDiv!.innerText = `${velocity} m/s`;
}

function handleWatchPositionError ( error: { message: any; code: any; } )
{
    const locationDisplayDiv = document.getElementById( "location-display" );
    locationDisplayDiv!.innerText = `ERROR: ${error.message} code: ${error.code}`;
}

const ACC_BUFFER_LENGTH = 50;
const ACC_BUFFER = new Array(ACC_BUFFER_LENGTH);
let ACC_BUFFER_INSERT_INDEX = 0;
// Acceleration buffer initialization
for (let i = 0; i < ACC_BUFFER.length; i++) {
    ACC_BUFFER[i] = { x: 0.0, y: 0.0, z: 0.0, ts: 0 };
}

function pushAcceleration( x: number,y:number,z:number,ts:number )
{
    // Round to 2 decimals to filter out noise
    x = Math.round( x * 100 ) / 100;
    y = Math.round( y * 100 ) / 100;
    z = Math.round( z * 100 ) / 100;

    ACC_BUFFER[ACC_BUFFER_INSERT_INDEX] = {x,y,z,ts};
    ACC_BUFFER_INSERT_INDEX = (ACC_BUFFER_INSERT_INDEX + 1) % ACC_BUFFER_LENGTH;
}

function getAverageAcceleration( oldestTsMillis: number )
{
    const accVector = { x: 0.0, y: 0.0, z: 0.0, ts: 0.0, count: 0 };
    const startIndex = ACC_BUFFER_LENGTH + ACC_BUFFER_INSERT_INDEX - 1;
    const endIndex = ACC_BUFFER_INSERT_INDEX - 1
    for( let i = startIndex; i > endIndex; i-- ) {
        const v = ACC_BUFFER[i % ACC_BUFFER_LENGTH];

        if ( v.ts < oldestTsMillis ) {
            break;
        }

        accVector.x += v.x;
        accVector.y += v.y;
        accVector.z += v.z;
        accVector.ts = v.ts;
        accVector.count++;
    }

    if ( accVector.count === 0 )
        return accVector;

    accVector.x /= accVector.count;
    accVector.y /= accVector.count;
    accVector.z /= accVector.count;

    accVector.x = Math.round( accVector.x * 100 ) / 100;
    accVector.y = Math.round( accVector.y * 100 ) / 100;
    accVector.z = Math.round( accVector.z * 100 ) / 100;

    return accVector;
}

function handleDeviceMotionEvent( event: DeviceMotionEvent )
{
    const motionEventdisplayDiv = document.getElementById( 'motionevent-display' );
    const { x, y, z } = event.acceleration!;
    const now = Date.now();

    pushAcceleration( x!, y!, z!, now );

    const avgAcc = getAverageAcceleration( now - 1000 );
    avgAcc.ts -= now;

    motionEventdisplayDiv!.innerHTML = `${JSON.stringify(avgAcc)}`;

}

export function main()
{
    // Set up interval
    //const locationRefreshIntervalId = setInterval( refreshGeolocationDisplay, 5000 );

    // Using watch
    const watchOptions = {
        enableHighAccuracy: true,
        timeout: 1000,
        maximumAge: 0,
    };

    const watchPositionId = navigator.geolocation.watchPosition( updatePositionDisplay, handleWatchPositionError, watchOptions );



    const requestPermissionSafari = (DeviceMotionEvent as any as DeviceMotionEventSafari).requestPermission;
    const requestPermission = (typeof requestPermissionSafari === 'function') ? requestPermissionSafari : () => Promise.resolve('granted');
    const isSafari = typeof (DeviceMotionEvent as any as DeviceMotionEventSafari).requestPermission === 'function';

    requestPermission()
    .then( (response: string) => {
        if( response === 'granted' ) {
            window.addEventListener("devicemotion", handleDeviceMotionEvent, true);
        }
    } )
    .catch( (error: string) => document.getElementById( 'motionevent-display' )!.innerText = error );
}