<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis styleCategories="Symbology|Labeling" version="3.28.0" labelsEnabled="1">
  <renderer-v2 type="singleSymbol" symbollevels="0" forceraster="0" enableorderby="0">
    <symbols>
      <symbol type="marker" name="0" alpha="1" clip_to_extent="1" force_rhr="0">
        <layer class="SimpleMarker" enabled="1" locked="0" pass="0">
          <Option type="Map">
            <Option type="QString" name="color" value="40,35,30,255"/>
            <Option type="QString" name="name" value="circle"/>
            <Option type="QString" name="outline_color" value="244,239,226,255"/>
            <Option type="QString" name="outline_width" value="0.2"/>
            <Option type="QString" name="outline_width_unit" value="MM"/>
            <Option type="QString" name="size" value="2"/>
            <Option type="QString" name="size_unit" value="MM"/>
          </Option>
          <data_defined_properties>
            <Option type="Map">
              <Option type="QString" name="name" value=""/>
              <Option type="Map" name="properties">
                <Option type="Map" name="size">
                  <Option type="bool" name="active" value="true"/>
                  <Option type="QString" name="expression" value="scale_linear(&quot;population&quot;, 300, 14000, 1.2, 6)"/>
                  <Option type="int" name="type" value="3"/>
                </Option>
              </Option>
              <Option type="QString" name="type" value="collection"/>
            </Option>
          </data_defined_properties>
        </layer>
      </symbol>
    </symbols>
  </renderer-v2>
  <labeling type="simple">
    <settings calloutType="simple">
      <text-style fieldName="name" isExpression="0" fontSize="8" fontSizeUnit="Point" textColor="40,35,30,255">
        <text-buffer bufferDraw="1" bufferSize="0.8" bufferSizeUnits="MM" bufferColor="244,239,226,255"/>
      </text-style>
      <placement placement="6" dist="1.2" distUnits="MM"/>
    </settings>
  </labeling>
  <layerGeometryType>0</layerGeometryType>
</qgis>
