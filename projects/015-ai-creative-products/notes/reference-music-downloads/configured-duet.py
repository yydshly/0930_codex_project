"""Original FIELD DUET: one event score drives WAV and bpy animation.

Python only:  python music_blender.py --audio-only --out output
Blender:      blender --background --python music_blender.py -- --out output
Render movie: blender --background --python music_blender.py -- --out output --render

The WAV path was run locally. bpy scene/render requires Blender and has not
been rendered on this machine. No source assets or source music are included.
The browser's v7 photography materials and refined models are a separate visual
pass; this portable bpy recipe still builds the simpler original example scene.
"""
import argparse
import json
import math
from pathlib import Path
import struct
import sys
import wave

DEFAULT_RECIPE = "{\"schemaVersion\":2,\"title\":\"FIELD DUET\",\"mood\":\"bright\",\"tempo\":150,\"volume\":25,\"duration\":12.8,\"fps\":24,\"notes\":[{\"midi\":60,\"at\":0,\"duration\":0.4,\"bass\":48},{\"midi\":67,\"at\":0.4,\"duration\":0.4,\"bass\":null},{\"midi\":72,\"at\":0.8,\"duration\":0.4,\"bass\":null},{\"midi\":76,\"at\":1.2,\"duration\":0.4,\"bass\":null},{\"midi\":74,\"at\":1.6,\"duration\":0.4,\"bass\":62},{\"midi\":72,\"at\":2,\"duration\":0.4,\"bass\":null},{\"midi\":69,\"at\":2.4,\"duration\":0.4,\"bass\":null},{\"midi\":67,\"at\":2.8,\"duration\":0.4,\"bass\":null},{\"midi\":65,\"at\":3.2,\"duration\":0.4,\"bass\":53},{\"midi\":69,\"at\":3.6,\"duration\":0.4,\"bass\":null},{\"midi\":74,\"at\":4,\"duration\":0.4,\"bass\":null},{\"midi\":77,\"at\":4.4,\"duration\":0.4,\"bass\":null},{\"midi\":76,\"at\":4.8,\"duration\":0.4,\"bass\":64},{\"midi\":72,\"at\":5.2,\"duration\":0.4,\"bass\":null},{\"midi\":67,\"at\":5.6,\"duration\":0.4,\"bass\":null},{\"midi\":60,\"at\":6,\"duration\":0.4,\"bass\":null},{\"midi\":60,\"at\":6.4,\"duration\":0.4,\"bass\":48},{\"midi\":67,\"at\":6.8,\"duration\":0.4,\"bass\":null},{\"midi\":72,\"at\":7.2,\"duration\":0.4,\"bass\":null},{\"midi\":76,\"at\":7.6,\"duration\":0.4,\"bass\":null},{\"midi\":74,\"at\":8,\"duration\":0.4,\"bass\":62},{\"midi\":72,\"at\":8.4,\"duration\":0.4,\"bass\":null},{\"midi\":69,\"at\":8.8,\"duration\":0.4,\"bass\":null},{\"midi\":67,\"at\":9.2,\"duration\":0.4,\"bass\":null},{\"midi\":77,\"at\":9.6,\"duration\":0.4,\"bass\":65},{\"midi\":69,\"at\":10,\"duration\":0.4,\"bass\":null},{\"midi\":74,\"at\":10.4,\"duration\":0.4,\"bass\":null},{\"midi\":77,\"at\":10.8,\"duration\":0.4,\"bass\":null},{\"midi\":88,\"at\":11.2,\"duration\":0.4,\"bass\":76},{\"midi\":72,\"at\":11.6,\"duration\":0.4,\"bass\":null},{\"midi\":67,\"at\":12,\"duration\":0.4,\"bass\":null},{\"midi\":60,\"at\":12.4,\"duration\":0.4,\"bass\":null}],\"source\":\"https://x.com/kevin_t_ngo/status/2105304249060274631\",\"sourceWorkflow\":\"Python composition / Python animation / Blender rendering\",\"ours\":\"Original characters and scene. Browser preview uses Three.js/Web Audio. Export script uses wave and bpy; enhanced browser materials and key-contact poses are not ported to the bpy example.\",\"blenderRendered\":false}"
MELODIES = {
    "calm": [60,64,67,72,69,67,64,62,60,64,65,69,67,64,62,60],
    "bright": [60,67,72,76,74,72,69,67,65,69,74,77,76,72,67,60],
    "night": [57,60,64,69,67,64,60,59,57,60,62,65,64,60,59,57],
}

def load_recipe(path=None):
    if path:
        recipe = json.loads(Path(path).read_text(encoding="utf-8"))
    elif DEFAULT_RECIPE:
        recipe = json.loads(DEFAULT_RECIPE)
    else:
        tempo, melody = 90, MELODIES["calm"]
        sequence = melody + [n + (12 if i >= 8 and i % 4 == 0 else 0) for i,n in enumerate(melody)]
        recipe = {"schemaVersion":2, "title":"FIELD DUET", "tempo":tempo,
                  "mood":"calm", "fps":24, "volume":25,
                  "notes":[{"midi":n,"at":i*60/tempo,"duration":60/tempo,
                            "bass":n-12 if i%4==0 else None} for i,n in enumerate(sequence)]}
    assert 60 <= recipe["tempo"] <= 150
    assert 0 < len(recipe["notes"]) <= 256
    for event in recipe["notes"]:
        assert 0 <= event["midi"] <= 127 and event["at"] >= 0 and event["duration"] > 0
    recipe["duration"] = max(e["at"]+e["duration"] for e in recipe["notes"])
    return recipe

def write_audio(recipe, output):
    rate = 22050
    samples = [0.0] * math.ceil((recipe["duration"]+.2)*rate)
    for event in recipe["notes"]:
        start = round(event["at"]*rate)
        for i in range(math.ceil(event["duration"]*rate)):
            if start+i >= len(samples):
                break
            local = i/rate
            envelope = min(1,local/.009)*math.exp(-local/(event["duration"]*.19))
            value = 0
            for midi,amp in [(event["midi"],1), (event.get("bass"),.35)]:
                if midi is None:
                    continue
                freq = 440*2**((midi-69)/12)
                value += amp*sum(math.sin(2*math.pi*freq*k*local)/(k*k) for k in range(1,5))
            samples[start+i] += value*envelope*.22*recipe.get("volume",25)/100
    with wave.open(str(output), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(b"".join(struct.pack("<h", round(max(-1,min(1,v))*32767)) for v in samples))
    return {"sampleRate":rate,"samples":len(samples),"seconds":len(samples)/rate,"events":len(recipe["notes"])}

def build_blender(recipe, folder, render=False):
    import bpy
    from mathutils import Vector
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    def material(name, color, roughness=.7, wooden=False):
        m=bpy.data.materials.new(name); m.use_nodes=True
        rgba=tuple(int(color[i:i+2],16)/255 for i in (1,3,5))+(1,)
        bsdf=m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value=rgba
        bsdf.inputs["Roughness"].default_value=roughness
        if wooden:
            nodes,links=m.node_tree.nodes,m.node_tree.links
            tex=nodes.new("ShaderNodeTexNoise"); tex.inputs["Scale"].default_value=4
            mapping=nodes.new("ShaderNodeVectorMath");mapping.operation="MULTIPLY";mapping.inputs[1].default_value=(.7,14,14)
            coord=nodes.new("ShaderNodeTexCoord"); links.new(coord.outputs["Generated"],mapping.inputs[0]);links.new(mapping.outputs[0],tex.inputs["Vector"])
            ramp=nodes.new("ShaderNodeValToRGB");ramp.color_ramp.elements[0].color=(.12,.055,.02,1);ramp.color_ramp.elements[1].color=(.49,.27,.12,1)
            links.new(tex.outputs["Fac"],ramp.inputs[0]);links.new(ramp.outputs[0],bsdf.inputs["Base Color"])
            bump=nodes.new("ShaderNodeBump");bump.inputs["Strength"].default_value=.15
            links.new(tex.outputs["Fac"],bump.inputs["Height"]);links.new(bump.outputs[0],bsdf.inputs["Normal"])
        return m
    wood=material("Original procedural oak","#ab794e",wooden=True)
    cream=material("Ivory keys","#efe5ce",.35)
    dark=material("Dark keys","#282121",.4)
    mint=material("Research robot mint","#9dbaa4",.45)
    green=material("Research robot screen","#204a40",.3)
    ink=material("Original cat fur","#322d2d",.9)
    yellow=material("Eyes","#dcc774",.25)
    paper=material("Original score paper","#efe0c4")
    def cube(name, size, position, mat, parent=None):
        bpy.ops.mesh.primitive_cube_add(size=1,location=position)
        o=bpy.context.object;o.name=name;o.scale=size;o.data.materials.append(mat)
        if parent:o.parent=parent
        bevel=o.modifiers.new("Small edge highlights","BEVEL");bevel.width=.025;bevel.segments=2
        return o
    def sphere(name,size,position,mat,parent=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,radius=1,location=position)
        o=bpy.context.object;o.name=name;o.scale=size;o.data.materials.append(mat)
        if parent:o.parent=parent
        for p in o.data.polygons:p.use_smooth=True
        return o
    def empty(name,position):
        o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=position;return o
    cube("Room floor",(22,15,.12),(0,0,-.2),wood)
    cube("Room wall",(18,.2,9),(0,-2.1,4),material("Wall","#51413b"))
    cube("Piano cabinet",(9,2.3,1.55),(0,.1,.68),wood)
    cube("Piano upright",(9,.65,1.85),(0,-.7,2.05),wood)
    cube("Piano lid",(9.5,.9,.18),(0,-.65,3.06),wood)
    cube("Piano key tray",(9.4,2.55,.18),(0,.1,1.45),wood)
    keys={}
    for i in range(25):
        x=-3.86+i*.322
        midi=48+(i//7)*12+[0,2,4,5,7,9,11][i%7]
        keys[midi]=(cube(f"Key_{midi}",(.305,1.43,.22),(x,.48,1.66),cream),1.66)
        if i%7 in (0,1,3,4,5):keys[midi+1]=(cube(f"BlackKey_{midi+1}",(.18,.8,.23),(x+.161,.13,1.85),dark),1.85)
    score=cube("Original score stand",(2.3,.06,1.15),(.2,-.27,2.45),paper)
    for row in range(3):
        for j in range(5):cube("Score line",(2,.011,.008),(.2,-.23,2.14+row*.28+j*.03),ink)
        for i in range(10):sphere("Score note",(.021,.015,.013),(-.7+i*.18,-.212,2.22+row*.28+math.sin(i*1.2+row)*.04),ink)
    robot=empty("Research robot",(-2,.63,1.82))
    cube("Robot body",(.95,.58,.65),(0,0,.5),mint,robot)
    cube("Robot head",(1.05,.69,.77),(0,0,1.15),mint,robot)
    cube("Robot screen",(.86,.025,.48),(0,.36,1.13),green,robot)
    for x in (-.22,.22):cube("Robot eye",(.13,.02,.12),(x,.383,1.19),yellow,robot)
    arms=[]
    for x in (-.3,.3):
        cube("Robot foot",(.21,.29,.32),(x,0,.08),mint,robot)
        arms.append(cube("Robot arm",(.2,.24,.49),(x*2,.07,.49),mint,robot))
    cat=empty("Original cat",(1.55,.68,1.79))
    sphere("Cat body",(.54,.3,.28),(0,0,.36),ink,cat)
    sphere("Cat head",(.31,.31,.31),(.45,.04,.58),ink,cat)
    for x in (.3,.58):
        bpy.ops.mesh.primitive_cone_add(vertices=3,radius1=.12,depth=.3,location=(x,.03,.89))
        o=bpy.context.object;o.parent=cat;o.name="Cat ear";o.data.materials.append(ink)
    for x in (.31,.59):sphere("Cat eye",(.053,.034,.053),(x,.292,.64),yellow,cat)
    feet=[]
    for x in (-.3,.3):
        for y in (-.16,.16):feet.append(cube("Cat foot",(.12,.13,.29),(x,y,.14),ink,cat))
    tail=sphere("Cat upright tail",(.05,.055,.38),(-.64,0,.69),ink,cat)
    for event_index,event in enumerate(recipe["notes"]):
        at=1+round(event["at"]*recipe["fps"])
        end=1+round((event["at"]+event["duration"])*recipe["fps"])
        middle=(at+end)//2
        key,key_height=keys[event["midi"]]
        for frame,z in [(at,key_height),(middle,key_height-.09),(end,key_height)]:
            key.location.z=z;key.keyframe_insert("location",frame=frame)
        for frame,bounce in [(at,0),(middle,.06),(end,0)]:
            robot.location.z=1.82+bounce;robot.rotation_euler.y=math.sin(event_index*.6)*.035
            robot.keyframe_insert("location",frame=frame);robot.keyframe_insert("rotation_euler",frame=frame)
            cat.location.x=1.2+math.sin(event_index*.3)*1.1;cat.location.z=1.79+bounce
            cat.keyframe_insert("location",frame=frame)
            for i,arm in enumerate(arms):
                arm.rotation_euler.x=-.4-bounce*10
                arm.keyframe_insert("rotation_euler",frame=frame)
            for i,foot in enumerate(feet):
                foot.location.z=.14+(bounce if i%2 else -bounce)
                foot.keyframe_insert("location",frame=frame)
    scene=bpy.context.scene
    scene.render.fps=recipe["fps"];scene.frame_start=1;scene.frame_end=1+round(recipe["duration"]*recipe["fps"])
    scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
    scene.render.engine="CYCLES";scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.world.color=(.16,.12,.09)
    for name,pos,color,power,size in [("Window light",(-5,5,8),(1,.8,.55),950,5),("Room fill",(1,3,6),(.65,.8,1),380,5),("Piano lamp",(4,-1,4),(1,.58,.2),230,2)]:
        bpy.ops.object.light_add(type="AREA",location=pos);light=bpy.context.object;light.name=name
        light.data.energy=power;light.data.color=color;light.data.shape="DISK";light.data.size=size
        light.rotation_euler=(Vector((0,0,1.5))-light.location).to_track_quat("-Z","Y").to_euler()
    bpy.ops.object.camera_add(location=(1.2,8,3.5));camera=bpy.context.object;scene.camera=camera
    camera.data.lens=45
    camera.rotation_euler=(Vector((0,.1,2.05))-camera.location).to_track_quat("-Z","Y").to_euler()
    editor=scene.sequence_editor_create()
    strips=getattr(editor,"strips",None)
    if strips is None:strips=editor.sequences
    strips.new_sound("Original Python score",str((folder/"field-duet.wav").resolve()),channel=1,frame_start=1)
    scene.render.image_settings.file_format="FFMPEG";scene.render.ffmpeg.format="MPEG4"
    scene.render.ffmpeg.codec="H264";scene.render.ffmpeg.audio_codec="AAC"
    scene.render.filepath=str((folder/"field-duet.mp4").resolve())
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str((folder/"field-duet.blend").resolve()))
    if render:bpy.ops.render.render(animation=True)
    return {"sceneCreated":True,"animationFrames":scene.frame_end,"rendered":render}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audio-only",action="store_true")
    parser.add_argument("--render",action="store_true")
    parser.add_argument("--out",default="field-duet-output")
    parser.add_argument("--recipe")
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    folder=Path(args.out).resolve();folder.mkdir(parents=True,exist_ok=True)
    recipe=load_recipe(args.recipe)
    (folder/"events.json").write_text(json.dumps(recipe,ensure_ascii=False,indent=2),encoding="utf-8")
    report={"audio":write_audio(recipe,folder/"field-duet.wav"),"blender":{"rendered":False}}
    if not args.audio_only:
        try:report["blender"]=build_blender(recipe,folder,args.render)
        except ImportError:
            report["blender"]["reason"]="bpy unavailable: run this script inside Blender. Audio/events were created."
    (folder/"pipeline-report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False))
    return 0 if args.audio_only or report["blender"].get("sceneCreated") else 2

if __name__=="__main__":
    raise SystemExit(main())

