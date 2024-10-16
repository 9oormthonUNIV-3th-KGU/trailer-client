'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

import { Button, buttonVariants } from '~/components/ui/button'
import { cn } from '~/utils/cn'
import Gps from '~/assets/gps-green.svg'
import Main from '~/assets/main.svg'
import PlaceInput from '~/components/place-input'
import PopularPlaceRank from '~/components/popular-place-rank'
import LocationPermissionButton from '~/components/location-permission-button'
import { TMap } from '~/components/t-map'
import { useLocationPermission } from '~/hooks/use-location-permission'
import { SiteHeader } from '~/components/site-header'

export default function Home() {
  const router = useRouter()
  const { isLocationAllowed } = useLocationPermission()
  const [inputs, setInputs] = useState(['출발지 입력', '도착지 입력'])
  const [isLoading, setIsLoading] = useState(false)

  const [startLocation, setStartLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const [endLocation, setEndLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const gpsIcon = <Image src={Gps} alt="gps" width={40} />

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setCurrentLocation({
            latitude,
            longitude,
          })
        },
        (error) => {
          console.error('현재 위치를 가져오지 못했습니다.', error)
        },
      )
    } else {
      console.log('이 브라우저는 위치 정보를 지원하지 않습니다.')
    }
  }, [])

  const handleInputChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newInputs = [...inputs]
    newInputs[index] = event.target.value
    setInputs(newInputs)
  }

  const handleGpsClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          const appKey = process.env.NEXT_PUBLIC_TMAP_APP_KEY
          const reverseGeocodeUrl = `https://apis.openapi.sk.com/tmap/geo/reversegeocoding?version=1&lat=${latitude}&lon=${longitude}&coordType=WGS84GEO&addressType=A10&appKey=${appKey}`

          try {
            const response = await fetch(reverseGeocodeUrl)
            const data = await response.json()

            if (data.addressInfo) {
              const fullAddress = data.addressInfo.fullAddress

              const addressParts = fullAddress.split(',')
              const secondAddress =
                addressParts.length > 1 ? addressParts[1] : fullAddress

              if (secondAddress) {
                const newInputs = [...inputs]
                newInputs[0] = secondAddress.trim()
                setInputs(newInputs)
              } else {
                console.error('주소를 찾을 수 없습니다.')
              }
            }
          } catch (error) {
            console.error('요청 실패', error)
          }
        },
        (error) => {
          console.error('현재 위치를 가져오지 못했습니다.', error)
        },
      )
    } else {
      console.log('이 브라우저는 위치 정보를 지원하지 않습니다.')
    }
  }

  // const handleData = (data: string, index: number) => {
  //   const newInputs = [...inputs]
  //   newInputs[index] = data
  //   setInputs(newInputs)
  // }

  const handleSearchClick = async () => {
    setIsLoading(true)

    if (inputs[0]) {
      await handleGeocoding(inputs[0], setStartLocation)
    }
    if (inputs[1]) {
      await handleGeocoding(inputs[1], setEndLocation)
    }

    setIsLoading(false)

    if (startLocation && endLocation) {
      const startX = startLocation?.longitude?.toString() || ''
      const startY = startLocation?.latitude?.toString() || ''
      const endX = endLocation?.longitude?.toString() || ''
      const endY = endLocation?.latitude?.toString() || ''

      const params = new URLSearchParams({
        from: inputs[0],
        to: inputs[1],
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
      })

      router.push(`/navigate?${params.toString()}`)
    }
  }

  const handleGeocoding = async (
    address: string,
    setLocation: React.Dispatch<
      React.SetStateAction<{ latitude: number; longitude: number } | null>
    >,
  ) => {
    const appKey = process.env.NEXT_PUBLIC_TMAP_APP_KEY
    const url = `https://apis.openapi.sk.com/tmap/geo/fullAddrGeo?version=1&format=json&appKey=${appKey}&fullAddr=${encodeURIComponent(address)}`

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (data.coordinateInfo && data.coordinateInfo.coordinate.length > 0) {
        const result = data.coordinateInfo.coordinate[0]
        const latitude = result.lat.length > 0 ? result.lat : result.newLat
        const longitude = result.lon.length > 0 ? result.lon : result.newLon
        setLocation({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        })
      } else {
        console.error('결과를 찾을 수 없습니다.')
      }
    } catch (error) {
      console.error('요청 실패', error)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5">
      <SiteHeader />
      <div className="flex flex-1 flex-col items-center space-y-8 pb-[76px] pt-6">
        <PlaceInput
          inputs={inputs}
          onChange={handleInputChange}
          icon={<button onClick={handleGpsClick}>{gpsIcon}</button>}
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-full">
            <Button
              onClick={handleSearchClick}
              className="h-18 w-[600px] text-extra font-semibold !text-white"
            >
              {isLoading ? '로딩 중...' : '길 찾기'}
            </Button>
          </div>

          <div className="mb-3 mt-16">
            <span className="text-center text-large font-semibold text-gray-900">
              내 주변 인기있는 장소
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col">
          <div className="relative mx-4 h-[65dvh] overflow-hidden rounded shadow">
            {currentLocation && (
              <TMap
                from={{
                  title: inputs[0],
                  x: startLocation
                    ? startLocation.longitude.toString()
                    : currentLocation?.longitude.toString(),
                  y: startLocation
                    ? startLocation.latitude.toString()
                    : currentLocation?.latitude.toString(),
                }}
                to={{
                  title: inputs[1],
                  x: endLocation
                    ? endLocation.longitude.toString()
                    : currentLocation?.longitude.toString(),
                  y: endLocation
                    ? endLocation.latitude.toString()
                    : currentLocation?.latitude.toString(),
                }}
              />
            )}
          </div>
          <PopularPlaceRank />
        </div>

        {!isLocationAllowed && (
          <div className="mt-3 text-center text-small font-medium text-gray-700">
            먼저 오른쪽 하단 버튼을 눌러 위치정보를 허용해주세요!
          </div>
        )}

        <div className="flex flex-col items-center justify-center">
          <div className="mb-2 mt-8 text-center text-large font-semibold text-gray-900">
            서비스가 마음에 드셨나요?
          </div>
          <div className="mb-3 text-center text-small font-medium text-gray-700">
            서비스 개선을 위해서 제안해주세요!
          </div>
        </div>

        <Link
          href="https://7zc54lj88vd.typeform.com/to/Pjwsa8Xz"
          className={`h-[60px] w-full ${cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}`}
        >
          제안하러 가기
        </Link>
        <div className="flex justify-center">
          <Image src={Main} alt="main" width={570} />
        </div>
        <LocationPermissionButton />
      </div>
    </div>
  )
}
