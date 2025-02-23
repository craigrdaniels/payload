import React, { useEffect, useState } from 'react'

import type { LivePreviewConfig } from '../../../../../exports/config'
import type { Field } from '../../../../../fields/config/types'
import type { EditViewProps } from '../../types'
import type { usePopupWindow } from '../usePopupWindow'

import { fieldSchemaToJSON } from '../../../../../utilities/fieldSchemaToJSON'
import { useAllFormFields } from '../../../forms/Form/context'
import reduceFieldsToValues from '../../../forms/Form/reduceFieldsToValues'
import { LivePreviewProvider } from '../Context'
import { useLivePreviewContext } from '../Context/context'
import { DeviceContainer } from '../Device'
import { IFrame } from '../IFrame'
import { LivePreviewToolbar } from '../Toolbar'
import './index.scss'

const baseClass = 'live-preview-window'

const Preview: React.FC<
  EditViewProps & {
    popupState: ReturnType<typeof usePopupWindow>
    url?: string
  }
> = (props) => {
  const {
    popupState: { isPopupOpen, popupHasLoaded, popupRef },
    url,
  } = props

  const { iframeHasLoaded, iframeRef, setIframeHasLoaded } = useLivePreviewContext()

  const { breakpoint } = useLivePreviewContext()

  const [fields] = useAllFormFields()

  const [fieldSchemaJSON] = useState(() => {
    let fields: Field[]

    if ('collection' in props) {
      const { collection } = props
      fields = collection.fields
    }

    if ('global' in props) {
      const { global } = props
      fields = global.fields
    }

    return fieldSchemaToJSON(fields)
  })

  // The preview could either be an iframe embedded on the page
  // Or it could be a separate popup window
  // We need to transmit data to both accordingly
  useEffect(() => {
    if (fields && window && 'postMessage' in window) {
      const values = reduceFieldsToValues(fields, true)

      // TODO: only send `fieldSchemaToJSON` one time
      const message = JSON.stringify({ data: values, fieldSchemaJSON, type: 'livePreview' })

      // external window
      if (isPopupOpen) {
        setIframeHasLoaded(false)

        if (popupHasLoaded && popupRef.current) {
          popupRef.current.postMessage(message, url)
        }
      }

      // embedded iframe
      if (!isPopupOpen) {
        if (iframeHasLoaded && iframeRef.current) {
          iframeRef.current.contentWindow?.postMessage(message, url)
        }
      }
    }
  }, [
    fields,
    url,
    iframeHasLoaded,
    isPopupOpen,
    popupRef,
    popupHasLoaded,
    iframeRef,
    setIframeHasLoaded,
    fieldSchemaJSON,
  ])

  if (!isPopupOpen) {
    return (
      <div
        className={[
          baseClass,
          isPopupOpen && `${baseClass}--popup-open`,
          breakpoint && breakpoint !== 'responsive' && `${baseClass}--has-breakpoint`,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className={`${baseClass}__wrapper`}>
          <LivePreviewToolbar {...props} iframeRef={iframeRef} url={url} />
          <div className={`${baseClass}__main`}>
            <DeviceContainer>
              <IFrame ref={iframeRef} setIframeHasLoaded={setIframeHasLoaded} url={url} />
            </DeviceContainer>
          </div>
        </div>
      </div>
    )
  }
}

export const LivePreview: React.FC<
  EditViewProps & {
    livePreviewConfig?: LivePreviewConfig
    popupState: ReturnType<typeof usePopupWindow>
    url?: string
  }
> = (props) => {
  const { livePreviewConfig, url } = props

  const breakpoints: LivePreviewConfig['breakpoints'] = [
    ...(livePreviewConfig?.breakpoints || []),
    {
      name: 'responsive',
      height: '100%',
      label: 'Responsive',
      width: '100%',
    },
  ]

  return (
    <LivePreviewProvider {...props} breakpoints={breakpoints} url={url}>
      <Preview {...props} />
    </LivePreviewProvider>
  )
}
